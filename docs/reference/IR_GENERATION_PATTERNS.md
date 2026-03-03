# IR生成パターンリファレンス

**バージョン**: 1.0
**最終更新**: 2026-02-24
**対象読者**: IRジェネレーターを実装するDistribution開発者
**ステータス**: 安定版

---

このドキュメントは**DSL非依存**です。MARS固有の構文には言及せず、汎用的なIR生成パターンを説明します。

---

## 目次

1. [概要](#概要)
2. [IR生成プロセス](#ir生成プロセス)
3. [Environment層の生成](#environment層の生成)
4. [Configuration層の生成](#configuration層の生成)
5. [Pattern層の生成](#pattern層の生成)
6. [Control層の生成](#control層の生成)
7. [Pydanticモデル使用パターン](#pydanticモデル使用パターン)
8. [一般的な変換パターン](#一般的な変換パターン)
9. [最適化戦略](#最適化戦略)

---

## 概要

### 目的

このドキュメントは、抽象構文木(AST)または類似の中間フォーマットからOiduna IR(中間表現)を生成するためのパターンを説明します。これらのパターンは**DSL非依存**であり、IR生成を実装するあらゆるDistributionに適用可能です。

### 主要な概念

**IR (Intermediate Representation)**: 完全な再生セッションを表現するOidunaの4層データモデルです。

**CompiledSession**: すべてのセッションデータを含む最上位のIR構造です。

**AST (Abstract Syntax Tree)**: ユーザーコードをパースした結果のDistribution固有の表現です(構造はDSLによって異なります)。

**IR生成**: ASTノードをOiduna IRモデルに変換するプロセスです。

### このドキュメントが扱う内容

- AST → IR変換の汎用パターン
- レイヤーごとの生成戦略
- 256ステップ展開パターン
- モデル構築のベストプラクティス
- パフォーマンス最適化テクニック

### このドキュメントが扱わない内容

- 音楽理論の処理(ピッチ解決、スケール計算、コード解析)
- DSL固有のパースや構文
- Distribution固有の機能
- SuperColliderやMIDIの実装詳細

---

## IR生成プロセス

### 高レベルフロー

```
┌──────────────────────────────────────────────────────┐
│ 1. ユーザーコードのパース                            │
│    入力: DSLコード(テキスト)                         │
│    出力: AST(木構造)                                 │
└───────────────┬──────────────────────────────────────┘
                │
                ↓
┌──────────────────────────────────────────────────────┐
│ 2. 意味解析(Distribution固有)                        │
│    - シンボル解決                                     │
│    - 型チェック                                       │
│    - 音楽理論の解決                                   │
│    - 制約の検証                                       │
└───────────────┬──────────────────────────────────────┘
                │
                ↓
┌──────────────────────────────────────────────────────┐
│ 3. IRの生成(このドキュメントの焦点)                  │
│    AST → CompiledSession                             │
│    ├─ Environment層                                  │
│    ├─ Configuration層                                │
│    ├─ Pattern層                                      │
│    └─ Control層                                      │
└───────────────┬──────────────────────────────────────┘
                │
                ↓
┌──────────────────────────────────────────────────────┐
│ 4. シリアライズと送信                                │
│    CompiledSession.to_dict() → JSON → HTTP POST      │
└──────────────────────────────────────────────────────┘
```

### 処理フェーズ

#### フェーズ1: メタデータの収集

ASTからグローバル設定を抽出します:
- BPM(テンポ)
- スイング量
- デフォルトゲート長
- トラック定義
- ミキサールーティング

#### フェーズ2: トラック設定の構築

AST内の各トラックについて:
- `Track`または`TrackMidi`モデルを作成
- サウンドパラメータを解決
- エフェクトチェーンを設定
- ミキサーセンドを設定

#### フェーズ3: イベントシーケンスの展開

抽象的なパターンを具体的なイベントに変換します:
- パターン記法をステップ位置(0-255)にマッピング
- ベロシティを解決
- ゲート長を計算
- マイクロタイミングオフセットを適用

#### フェーズ4: コントロール構造の作成

再生コントロールを定義します:
- シーンを作成(該当する場合)
- アプリケーションタイミングを設定
- トラックグループを定義

---

## Environment層の生成

### パターン: グローバル設定の抽出

```python
def generate_environment(ast) -> Environment:
    """ASTからグローバル設定を抽出します。"""
    return Environment(
        bpm=extract_bpm(ast),
        default_gate=extract_default_gate(ast) or 1.0,
        swing=extract_swing(ast) or 0.0,
        loop_steps=256  # 常に256、変更不可
    )
```

### 一般的な変換

#### BPM抽出

```python
# パターン1: 直接値
def extract_bpm(ast) -> float:
    bpm_node = find_node(ast, type="bpm_declaration")
    if bpm_node:
        return float(bpm_node.value)
    return 120.0  # デフォルト

# パターン2: テンポ記号から
def extract_bpm_from_marking(marking: str) -> float:
    tempo_map = {
        "andante": 80.0,
        "moderato": 108.0,
        "allegro": 140.0,
        # ... など
    }
    return tempo_map.get(marking.lower(), 120.0)
```

#### スイング計算

```python
# パターン: 0.0-1.0範囲に正規化
def extract_swing(ast) -> float:
    swing_node = find_node(ast, type="swing")
    if not swing_node:
        return 0.0

    # 例: パーセンテージを比率に変換
    if swing_node.unit == "percent":
        return swing_node.value / 100.0

    # 例: すでに正規化済み
    if swing_node.unit == "ratio":
        return swing_node.value

    return 0.0
```

### 重要な制約

**loop_stepsは常に256である必要があります**
```python
# 正しい
Environment(loop_steps=256)

# 間違い - 実行時エラーを引き起こします
Environment(loop_steps=512)  # これをしないでください!
```

**非推奨フィールド(v1.1)**
```python
# これらのフィールドは存在しますが、v1.1で削除されます
# 新しいDistributionではこれらに依存しないでください
Environment(
    scale="C_major",  # 非推奨 - Distributionで処理してください
    chords=[...]      # 非推奨 - Distributionで処理してください
)
```

---

## Configuration層の生成

### パターン: トラック生成

#### オーディオトラック(SuperDirt)

```python
def generate_audio_track(track_ast) -> Track:
    """ASTノードからTrackを生成します。"""
    track_id = track_ast.identifier

    # メタ情報
    meta = TrackMeta(
        track_id=track_id,
        mute=track_ast.muted or False,
        solo=track_ast.solo or False,
        range_id=2  # レガシーフィールド、通常は2
    )

    # サウンドパラメータ
    params = TrackParams(
        s=resolve_sound_name(track_ast.sound),
        s_path=track_ast.sound,  # 元のパスを保持
        n=track_ast.sample_number or 0,
        gain=track_ast.gain or 1.0,
        pan=track_ast.pan or 0.5,
        speed=track_ast.speed or 1.0,
        begin=track_ast.begin or 0.0,
        end=track_ast.end or 1.0,
        orbit=track_ast.orbit or 0,
        cut=track_ast.cut,
        legato=track_ast.legato,
        extra_params=extract_extra_params(track_ast)
    )

    # エフェクト
    track_fx = generate_track_fx(track_ast)

    # ミキサーセンド
    sends = generate_sends(track_ast)

    return Track(
        meta=meta,
        params=params,
        fx=FxParams(),  # レガシー、通常は空
        track_fx=track_fx,
        sends=sends,
        modulations={}  # モジュレーションは高度な機能、多くの場合空
    )
```

#### MIDIトラック

```python
def generate_midi_track(track_ast) -> TrackMidi:
    """ASTノードからTrackMidiを生成します。"""
    return TrackMidi(
        track_id=track_ast.identifier,
        channel=track_ast.midi_channel,  # 0-15
        velocity=track_ast.default_velocity or 127,
        transpose=track_ast.transpose or 0,
        mute=track_ast.muted or False,
        solo=track_ast.solo or False,
        cc_modulations={},
        pitch_bend_modulation=None,
        aftertouch_modulation=None,
        velocity_modulation=None
    )
```

### パターン: エフェクト生成

```python
def generate_track_fx(track_ast) -> TrackFxParams:
    """音色整形エフェクトを生成します。"""
    fx_node = find_node(track_ast, type="effects")
    if not fx_node:
        return TrackFxParams()

    return TrackFxParams(
        # フィルター
        cutoff=fx_node.get("cutoff"),
        resonance=fx_node.get("resonance"),
        hcutoff=fx_node.get("hcutoff"),
        hresonance=fx_node.get("hresonance"),
        bandf=fx_node.get("bandf"),
        bandq=fx_node.get("bandq"),
        vowel=fx_node.get("vowel"),

        # ディストーション
        shape=fx_node.get("shape"),
        crush=fx_node.get("crush"),
        coarse=fx_node.get("coarse"),
        triode=fx_node.get("triode"),

        # エンベロープ
        attack=fx_node.get("attack"),
        hold=fx_node.get("hold"),
        decay=fx_node.get("decay"),
        release=fx_node.get("release"),

        # リングモジュレーション
        ring=fx_node.get("ring"),
        ringf=fx_node.get("ringf"),
        ringdf=fx_node.get("ringdf")
    )
```

### パターン: ミキサーライン生成

```python
def generate_mixer_lines(ast) -> dict[str, MixerLine]:
    """ミキサーバスとマスターセクションを生成します。"""
    mixer_lines = {}

    # パターン1: 明示的なミキサー定義
    for mixer_node in find_nodes(ast, type="mixer_line"):
        mixer_lines[mixer_node.name] = MixerLine(
            name=mixer_node.name,
            include=tuple(mixer_node.track_list),
            volume=mixer_node.volume or 1.0,
            pan=mixer_node.pan or 0.5,
            mute=mixer_node.muted or False,
            solo=mixer_node.solo or False,
            output=mixer_node.output or 0,
            dynamics=generate_dynamics(mixer_node),
            fx=generate_mixer_fx(mixer_node)
        )

    # パターン2: センドから自動生成
    for track_ast in find_nodes(ast, type="track"):
        for send in track_ast.sends:
            if send.target not in mixer_lines:
                # 暗黙的なミキサーラインを作成
                mixer_lines[send.target] = MixerLine(
                    name=send.target,
                    include=(),  # 後で設定されます
                    volume=1.0,
                    pan=0.5,
                    dynamics=MixerLineDynamics(),
                    fx=MixerLineFx()
                )

    return mixer_lines
```

### パターン: センド生成

```python
def generate_sends(track_ast) -> tuple[Send, ...]:
    """トラックのミキサーセンドを生成します。"""
    sends = []

    for send_node in find_nodes(track_ast, type="send"):
        sends.append(Send(
            mixer_line=send_node.target,
            gain=send_node.level or 1.0,
            pan=send_node.pan or 0.5
        ))

    # 明示的なセンドがない場合、デフォルトのマスターセンドを作成
    if not sends:
        sends.append(Send(
            mixer_line="master",
            gain=1.0,
            pan=0.5
        ))

    return tuple(sends)
```

---

## Pattern層の生成

### 256ステップ展開戦略

核心的な課題: 抽象的なパターン記法を具体的なステップ位置(0-255)にマッピングすることです。

#### パターン1: 直接ステップマッピング

```python
def expand_direct_steps(pattern_ast, total_steps: int = 256) -> list[Event]:
    """パターンが明示的なステップ位置を持つ場合。"""
    events = []

    for note_node in pattern_ast.notes:
        # ノートが絶対ステップ位置を指定
        step = note_node.step
        if 0 <= step < 256:
            events.append(Event(
                step=step,
                velocity=note_node.velocity or 1.0,
                note=note_node.pitch,  # 事前解決されたMIDIノート
                gate=note_node.gate or 1.0,
                offset_ms=note_node.offset or 0.0
            ))

    return events
```

#### パターン2: グリッドベース展開

```python
def expand_grid_pattern(
    pattern_ast,
    grid_size: int = 16,  # 1小節あたり16ステップ
    num_bars: int = 16    # 合計16小節 = 256ステップ
) -> list[Event]:
    """パターンがグリッド記法を使用する場合(例: 'X..X..X.')。"""
    events = []
    steps_per_cell = grid_size // len(pattern_ast.grid)

    for bar_idx in range(num_bars):
        for cell_idx, symbol in enumerate(pattern_ast.grid):
            if is_trigger(symbol):
                step = (bar_idx * grid_size) + (cell_idx * steps_per_cell)
                velocity = symbol_to_velocity(symbol)

                events.append(Event(
                    step=step,
                    velocity=velocity,
                    note=pattern_ast.pitch,
                    gate=pattern_ast.gate or 1.0
                ))

    return events

def is_trigger(symbol: str) -> bool:
    """シンボルがトリガーを表すかチェックします。"""
    return symbol in ['X', 'x', 'o', '1']

def symbol_to_velocity(symbol: str) -> float:
    """シンボルをベロシティ値にマッピングします。"""
    velocity_map = {
        'X': 1.0,    # フルベロシティ
        'x': 0.7,    # ミディアムベロシティ
        'o': 0.4,    # ローベロシティ
        '.': 0.0,    # 休符
    }
    return velocity_map.get(symbol, 1.0)
```

#### パターン3: ユークリッド分布

```python
def expand_euclidean(
    pulses: int,
    steps: int,
    rotation: int = 0,
    total_steps: int = 256
) -> list[Event]:
    """ユークリッドリズムパターンを生成します。

    Args:
        pulses: ヒット数
        steps: パターン内の総ステップ数
        rotation: パターンをNステップ回転
        total_steps: ループの総ステップ数(256)
    """
    # ユークリッドパターンを生成
    pattern = euclidean_algorithm(pulses, steps)

    # 回転
    pattern = pattern[rotation:] + pattern[:rotation]

    # 256ステップに展開
    events = []
    repetitions = total_steps // steps

    for rep in range(repetitions):
        for i, active in enumerate(pattern):
            if active:
                step = rep * steps + i
                events.append(Event(
                    step=step,
                    velocity=1.0,
                    gate=1.0
                ))

    return events

def euclidean_algorithm(pulses: int, steps: int) -> list[bool]:
    """ユークリッドリズムのためのBjorklundアルゴリズムです。"""
    if pulses >= steps or pulses == 0:
        # エッジケース
        return [True] * pulses + [False] * (steps - pulses)

    # Bjorklundアルゴリズムを使用してパターンを構築
    pattern = [[True]] * pulses + [[False]] * (steps - pulses)

    while len(set(map(tuple, pattern))) > 1:
        # パターンをグループ化
        i = 0
        for j in range(1, len(pattern)):
            if pattern[j] != pattern[i]:
                i = j
                break

        # グループを結合
        pattern = [pattern[k] + pattern[-(k+1)]
                   for k in range(i)] + pattern[i:-i]

    # フラット化
    return [item for sublist in pattern for item in sublist]
```

#### パターン4: ノート長計算

```python
def calculate_step_gate(
    duration_spec,
    steps_per_beat: int = 4,
    bpm: float = 120.0
) -> tuple[int, float]:
    """デュレーションからステップ数とゲートを計算します。

    Returns:
        (step_count, gate_ratio)
    """
    # パターン: ビートの分数としてのデュレーション
    if duration_spec.unit == "beats":
        step_count = int(duration_spec.value * steps_per_beat)
        gate = 1.0
        return (step_count, gate)

    # パターン: 音符長としてのデュレーション(4分音符、8分音符など)
    if duration_spec.unit == "note_length":
        note_to_steps = {
            "whole": 16,
            "half": 8,
            "quarter": 4,
            "eighth": 2,
            "sixteenth": 1
        }
        step_count = note_to_steps.get(duration_spec.value, 4)
        gate = 1.0
        return (step_count, gate)

    # パターン: ミリ秒単位のデュレーション
    if duration_spec.unit == "ms":
        step_duration_ms = 60000.0 / bpm / steps_per_beat
        step_count = max(1, int(duration_spec.value / step_duration_ms))
        gate = (duration_spec.value / step_duration_ms) / step_count
        return (step_count, min(gate, 1.0))

    return (1, 1.0)
```

### パターン: EventSequence構築

```python
def build_event_sequence(track_id: str, events: list[Event]) -> EventSequence:
    """自動インデックス化を使用してEventSequenceを構築します。"""
    # イベントをステップでソート(インデックス構築に必要)
    events_sorted = sorted(events, key=lambda e: e.step)

    # ファクトリーメソッドを使用してステップインデックスを自動構築
    return EventSequence.from_events(track_id, events_sorted)
```

### パターン: ポリフォニーの処理

```python
def expand_polyphonic_pattern(pattern_ast) -> list[Event]:
    """複数の同時ノートを持つパターンを処理します。"""
    events = []

    for chord_node in pattern_ast.chords:
        step = chord_node.step

        # 同じステップに複数のノート
        for pitch in chord_node.pitches:
            events.append(Event(
                step=step,
                velocity=chord_node.velocity or 1.0,
                note=pitch,
                gate=chord_node.gate or 1.0
            ))

    return events
```

### パターン: マイクロタイミング(offset_ms)

```python
def apply_swing_offset(
    events: list[Event],
    swing_amount: float,
    bpm: float
) -> list[Event]:
    """裏拍のイベントにスイングを適用します。

    Args:
        events: 元のイベント
        swing_amount: 0.0(ストレート)から1.0(最大スイング)
        bpm: テンポ
    """
    step_duration_ms = 60000.0 / bpm / 4
    max_swing_ms = step_duration_ms * 0.5  # 最大ディレイ

    swung_events = []
    for event in events:
        # 奇数ステップ(裏拍)にスイングを適用
        if event.step % 2 == 1:
            offset = swing_amount * max_swing_ms
            swung_events.append(Event(
                step=event.step,
                velocity=event.velocity,
                note=event.note,
                gate=event.gate,
                offset_ms=offset
            ))
        else:
            swung_events.append(event)

    return swung_events

def create_flam(base_event: Event, grace_delay_ms: float = 5.0) -> list[Event]:
    """フラム効果を作成します(装飾音符 + メイン音符)。"""
    return [
        Event(  # 装飾音符
            step=base_event.step,
            velocity=base_event.velocity * 0.3,
            note=base_event.note,
            gate=base_event.gate * 0.5,
            offset_ms=-grace_delay_ms
        ),
        Event(  # メイン音符
            step=base_event.step,
            velocity=base_event.velocity,
            note=base_event.note,
            gate=base_event.gate,
            offset_ms=0.0
        )
    ]
```

---

## Control層の生成

### パターン: ApplyCommand生成

```python
def generate_apply_command(ast) -> ApplyCommand | None:
    """再生コントロールコマンドを生成します。"""
    apply_node = find_node(ast, type="apply")
    if not apply_node:
        return ApplyCommand(timing="bar")  # デフォルト

    timing_map = {
        "immediate": "now",
        "next_beat": "beat",
        "next_bar": "bar",
        "next_loop": "seq"
    }

    return ApplyCommand(
        timing=timing_map.get(apply_node.timing, "bar"),
        track_ids=apply_node.target_tracks or [],
        scene_name=apply_node.scene_name
    )
```

### パターン: シーン生成

```python
def generate_scenes(ast) -> dict[str, Scene]:
    """シーン定義を生成します。"""
    scenes = {}

    for scene_node in find_nodes(ast, type="scene"):
        # 各シーンはセッション状態のスナップショット
        scene_tracks = {
            track_id: generate_audio_track(track_ast)
            for track_id, track_ast in scene_node.tracks.items()
        }

        scene_sequences = {
            track_id: build_event_sequence(track_id, expand_pattern(pattern_ast))
            for track_id, pattern_ast in scene_node.patterns.items()
        }

        scenes[scene_node.name] = Scene(
            name=scene_node.name,
            environment=generate_environment(scene_node) if scene_node.has_env else None,
            tracks=scene_tracks,
            tracks_midi={},
            sequences=scene_sequences,
            mixer_lines={}
        )

    return scenes
```

---

## Pydanticモデル使用パターン

### パターン: モデルインポート

```python
from oiduna_core.ir import (
    CompiledSession,
    Environment,
    Track, TrackMeta, TrackParams, FxParams, TrackFxParams,
    TrackMidi,
    MixerLine, MixerLineDynamics, MixerLineFx,
    Send,
    EventSequence, Event,
    Scene,
    ApplyCommand
)
```

### パターン: 安全なモデル構築

```python
def safe_track_params(**kwargs) -> TrackParams:
    """検証付きでTrackParamsを構築します。"""
    # None値を除外
    filtered = {k: v for k, v in kwargs.items() if v is not None}

    # デフォルトを適用
    defaults = {
        "s": "bd",
        "n": 0,
        "gain": 1.0,
        "pan": 0.5,
        "speed": 1.0,
        "begin": 0.0,
        "end": 1.0,
        "orbit": 0
    }

    params = {**defaults, **filtered}

    try:
        return TrackParams(**params)
    except ValidationError as e:
        # 検証エラーを処理
        raise IRGenerationError(f"Invalid track parameters: {e}")
```

### パターン: 段階的セッション構築

```python
class SessionBuilder:
    """CompiledSessionのビルダーパターンです。"""

    def __init__(self):
        self.environment = Environment()
        self.tracks = {}
        self.tracks_midi = {}
        self.mixer_lines = {}
        self.sequences = {}
        self.scenes = {}
        self.apply = None

    def set_bpm(self, bpm: float) -> 'SessionBuilder':
        self.environment = Environment(
            bpm=bpm,
            default_gate=self.environment.default_gate,
            swing=self.environment.swing
        )
        return self

    def add_track(self, track: Track) -> 'SessionBuilder':
        self.tracks[track.meta.track_id] = track
        return self

    def add_sequence(self, sequence: EventSequence) -> 'SessionBuilder':
        self.sequences[sequence.track_id] = sequence
        return self

    def build(self) -> CompiledSession:
        """最終的なCompiledSessionを構築します。"""
        return CompiledSession(
            environment=self.environment,
            tracks=self.tracks,
            tracks_midi=self.tracks_midi,
            mixer_lines=self.mixer_lines,
            sequences=self.sequences,
            scenes=self.scenes,
            apply=self.apply or ApplyCommand(timing="bar")
        )

# 使用例
session = (SessionBuilder()
    .set_bpm(140.0)
    .add_track(kick_track)
    .add_sequence(kick_sequence)
    .build())
```

### パターン: 検証

```python
def validate_session(session: CompiledSession) -> list[str]:
    """セッションの整合性を検証します。"""
    errors = []

    # トラック-シーケンス対応をチェック
    for track_id in session.tracks.keys():
        if track_id not in session.sequences:
            errors.append(f"Track '{track_id}' has no sequence")

    for seq_id in session.sequences.keys():
        if seq_id not in session.tracks and seq_id not in session.tracks_midi:
            errors.append(f"Sequence '{seq_id}' has no corresponding track")

    # ミキサーライン参照をチェック
    for line_name, line in session.mixer_lines.items():
        for track_id in line.include:
            if track_id not in session.tracks:
                errors.append(
                    f"Mixer line '{line_name}' references unknown track '{track_id}'"
                )

    # イベントステップ境界をチェック
    for seq_id, sequence in session.sequences.items():
        for event in sequence._events:
            if not (0 <= event.step < 256):
                errors.append(
                    f"Sequence '{seq_id}' has event at invalid step {event.step}"
                )

    return errors
```

---

## 一般的な変換パターン

### パターン: パラメータ正規化

```python
def normalize_pan(value, input_range: tuple = (-1, 1)) -> float:
    """パンをOidunaの0.0-1.0範囲に正規化します。

    一般的な入力範囲:
        (-1, 1): L=-1, Center=0, R=1
        (0, 127): MIDI CC範囲
        (-100, 100): パーセンテージ
    """
    min_in, max_in = input_range
    normalized = (value - min_in) / (max_in - min_in)
    return max(0.0, min(1.0, normalized))

def normalize_velocity(value, input_range: tuple = (0, 127)) -> float:
    """ベロシティを0.0-1.0に正規化します。"""
    min_in, max_in = input_range
    normalized = (value - min_in) / (max_in - min_in)
    return max(0.0, min(1.0, normalized))
```

### パターン: 拍子記号マッピング

```python
def map_time_signature_to_256(
    numerator: int,
    denominator: int
) -> dict:
    """拍子記号を256ステップフォーマットにマッピングします。

    Returns:
        {
            'steps_per_bar': int,
            'num_bars': int,
            'unused_steps': int
        }
    """
    # 1小節あたりのステップ数を計算(分母が拍単位と仮定)
    beats_per_bar = numerator
    steps_per_beat = 4  # 16分音符解像度
    steps_per_bar = beats_per_bar * steps_per_beat

    # 256ステップに収まる完全な小節数を計算
    num_bars = 256 // steps_per_bar
    unused_steps = 256 - (num_bars * steps_per_bar)

    return {
        'steps_per_bar': steps_per_bar,
        'num_bars': num_bars,
        'unused_steps': unused_steps
    }

# 例:
# 4/4: 1小節16ステップ × 16小節 = 256ステップ(未使用0)
# 3/4: 1小節12ステップ × 21小節 = 252ステップ(未使用4)
# 5/4: 1小節20ステップ × 12小節 = 240ステップ(未使用16)
```

### パターン: 階層的パラメータ解決

```python
def resolve_parameter(param_name: str, sources: list[dict]) -> Any:
    """ソースの階層からパラメータを解決します。

    ソースは順番にチェックされます(最も具体的なものが最初)。
    最初のNoneでない値が返されます。
    """
    for source in sources:
        value = source.get(param_name)
        if value is not None:
            return value
    return None

# 使用例
gain = resolve_parameter('gain', [
    event_overrides,      # イベントレベルのオーバーライド
    track_settings,       # トラックのデフォルト
    global_settings,      # グローバルのデフォルト
    {'gain': 1.0}         # フォールバック
])
```

### パターン: バッチイベント生成

```python
def generate_events_batch(
    pattern_nodes: list,
    track_id: str
) -> EventSequence:
    """効率のためにイベントをバッチで生成します。"""
    events = []

    # イベントリストの容量を事前割り当て
    estimated_size = sum(estimate_events(node) for node in pattern_nodes)
    events.reserve(estimated_size)  # カスタムリスト型を使用する場合

    # すべてのイベントを生成
    for node in pattern_nodes:
        events.extend(expand_pattern(node))

    # 単一のソート操作
    events.sort(key=lambda e: (e.step, e.note or 0))

    # シーケンスを構築(インデックスを1回構築)
    return EventSequence.from_events(track_id, events)
```

---

## 最適化戦略

### 戦略1: 遅延評価

```python
class LazyPattern:
    """必要になるまでパターン展開を遅延させます。"""

    def __init__(self, pattern_ast):
        self._ast = pattern_ast
        self._events = None

    @property
    def events(self) -> list[Event]:
        if self._events is None:
            self._events = expand_pattern(self._ast)
        return self._events
```

### 戦略2: 解決済み値のキャッシング

```python
class CachingResolver:
    """解決されたパラメータ値をキャッシュします。"""

    def __init__(self):
        self._cache = {}

    def resolve_sound(self, path: str) -> str:
        if path not in self._cache:
            self._cache[path] = expensive_sound_lookup(path)
        return self._cache[path]
```

### 戦略3: イベント重複排除

```python
def deduplicate_events(events: list[Event]) -> list[Event]:
    """同じステップの重複イベントを削除します。"""
    seen = set()
    unique = []

    for event in events:
        # ハッシュ可能なキーを作成
        key = (event.step, event.note, event.velocity, event.gate)

        if key not in seen:
            seen.add(key)
            unique.append(event)

    return unique
```

### 戦略4: オブジェクト作成の最小化

```python
# 非効率的: 多くの中間オブジェクトを作成
def build_track_inefficient(ast):
    meta = TrackMeta(track_id=ast.id)
    params = TrackParams(s=ast.sound)
    track = Track(meta=meta, params=params, ...)
    return track

# 効率的: 単一のオブジェクト作成
def build_track_efficient(ast):
    return Track(
        meta=TrackMeta(track_id=ast.id),
        params=TrackParams(s=ast.sound),
        fx=FxParams(),
        track_fx=TrackFxParams(),
        sends=tuple(),
        modulations={}
    )
```

### 戦略5: 定数の事前計算

```python
class IRGenerator:
    """事前計算された定数を持つジェネレーターです。"""

    def __init__(self, bpm: float):
        self.bpm = bpm
        # これらを1回だけ事前計算
        self.step_duration_ms = 60000.0 / bpm / 4
        self.steps_per_beat = 4
        self.steps_per_bar = 16

    def calculate_step_from_ms(self, offset_ms: float) -> int:
        return int(offset_ms / self.step_duration_ms)
```

### 戦略6: 一括検証

```python
def validate_events_bulk(events: list[Event]) -> bool:
    """すべてのイベントを効率的に検証します。"""
    # 単一パスの検証
    return all(
        0 <= e.step < 256 and
        0.0 <= e.velocity <= 1.0 and
        0.0 <= e.gate <= 2.0 and
        (e.note is None or 0 <= e.note <= 127)
        for e in events
    )
```

### 戦略7: 不変オブジェクトの再利用

```python
# IRモデルは不変なので、同一オブジェクトを共有できます
DEFAULT_FX = FxParams()
DEFAULT_TRACK_FX = TrackFxParams()
DEFAULT_MIXER_FX = MixerLineFx()

def build_track_with_defaults(track_id: str, sound: str):
    return Track(
        meta=TrackMeta(track_id=track_id),
        params=TrackParams(s=sound),
        fx=DEFAULT_FX,           # 再利用
        track_fx=DEFAULT_TRACK_FX,  # 再利用
        sends=tuple(),
        modulations={}
    )
```

---

## 完全な例

### すべてをまとめる

```python
from oiduna_core.ir import *

def compile_to_ir(ast) -> CompiledSession:
    """完全なAST → IRコンパイルの例です。"""

    # 1. Environment層
    environment = Environment(
        bpm=extract_bpm(ast),
        default_gate=1.0,
        swing=extract_swing(ast),
        loop_steps=256
    )

    # 2. Configuration層
    tracks = {}
    tracks_midi = {}
    sequences = {}

    for track_ast in find_nodes(ast, type="track"):
        track_id = track_ast.identifier

        if track_ast.type == "audio":
            # オーディオトラック
            tracks[track_id] = Track(
                meta=TrackMeta(track_id=track_id),
                params=TrackParams(
                    s=resolve_sound_name(track_ast.sound),
                    gain=track_ast.gain or 1.0,
                    pan=normalize_pan(track_ast.pan or 0)
                ),
                fx=FxParams(),
                track_fx=generate_track_fx(track_ast),
                sends=generate_sends(track_ast),
                modulations={}
            )
        elif track_ast.type == "midi":
            # MIDIトラック
            tracks_midi[track_id] = TrackMidi(
                track_id=track_id,
                channel=track_ast.channel,
                velocity=track_ast.velocity or 127,
                transpose=track_ast.transpose or 0
            )

        # 3. Pattern層
        pattern_ast = find_pattern_for_track(ast, track_id)
        events = expand_pattern(pattern_ast, environment.bpm)
        sequences[track_id] = EventSequence.from_events(track_id, events)

    # ミキサーライン
    mixer_lines = generate_mixer_lines(ast)

    # 4. Control層
    scenes = generate_scenes(ast)
    apply = generate_apply_command(ast)

    # 組み立て
    session = CompiledSession(
        environment=environment,
        tracks=tracks,
        tracks_midi=tracks_midi,
        mixer_lines=mixer_lines,
        sequences=sequences,
        scenes=scenes,
        apply=apply
    )

    # 検証
    errors = validate_session(session)
    if errors:
        raise IRGenerationError(f"Invalid session: {errors}")

    return session
```

---

## 関連ドキュメント

### Oiduna Coreドキュメント

- [DATA_MODEL_REFERENCE.md](../../../../oiduna/docs/DATA_MODEL_REFERENCE.md) - 完全なIRモデル仕様
- [DISTRIBUTION_GUIDE.md](../../../../oiduna/docs/DISTRIBUTION_GUIDE.md) - Distribution開発者ガイド
- [ARCHITECTURE.md](../../../../oiduna/docs/ARCHITECTURE.md) - システムアーキテクチャと設計決定

### MARS Distributionドキュメント

- [ARCHITECTURE.md](./ARCHITECTURE.md) - MARS固有のアーキテクチャ
- [OIDUNA_API_INTEGRATION.md](./OIDUNA_API_INTEGRATION.md) - MARS ↔ Oiduna統合

---

## バージョン履歴

### v1.0 (2026-02-24)
- 初版リリース
- DSL非依存パターン
- 256ステップ展開戦略
- Pydanticモデル使用方法
- 最適化戦略

---

**ドキュメントバージョン**: 1.0
**最終更新**: 2026-02-24
**次回レビュー**: 最初のDistribution実装後
