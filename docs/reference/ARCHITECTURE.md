# Distribution Architecture

**対象読者**: Distribution開発者
**目的**: MARS_for_oidunaのコンポーネント構成を理解する

このドキュメントは**DSL非依存**です。MARS固有の構文には言及せず、汎用的なアーキテクチャパターンを説明します。

---

## 目次

1. [全体像](#全体像)
2. [5大コンポーネント](#5大コンポーネント)
3. [データフロー](#データフロー)
4. [技術スタック](#技術スタック)
5. [責任分離](#責任分離)

---

## 全体像

Distribution実装は**5つの主要コンポーネント**で構成されます：

```
┌──────────────────────────────────────────────────────────────┐
│                      Distribution                            │
│                                                              │
│  ┌──────────────┐                                           │
│  │ 1. DSL       │  ユーザーがコードを書く                    │
│  │    Parser    │  .lark文法でパース → AST                  │
│  └──────┬───────┘                                           │
│         │ AST                                               │
│         ↓                                                   │
│  ┌──────────────┐                                           │
│  │ 2. Validator │  ASTの妥当性を検証                         │
│  │              │  セマンティックチェック                    │
│  └──────┬───────┘                                           │
│         │ Validated AST                                     │
│         ↓                                                   │
│  ┌──────────────┐                                           │
│  │ 3. IR        │  AST → Oiduna CompiledSession             │
│  │    Generator │  256ステップ展開                          │
│  └──────┬───────┘                                           │
│         │ CompiledSession (JSON)                            │
│         ↓                                                   │
│  ┌──────────────┐                                           │
│  │ 4. API       │  HTTP POST /playback/session              │
│  │    Client    │  SSE /stream でリアルタイム状態取得         │
│  └──────┬───────┘                                           │
│         │                                                   │
│  ┌──────────────┐                                           │
│  │ 5. Frontend  │  Monaco Editor                            │
│  │    (Editor)  │  シンタックスハイライト                    │
│  │              │  オートコンプリート                        │
│  │              │  リアルタイムエラー表示                    │
│  └──────────────┘                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
         │
         │ HTTP/JSON
         ↓
┌──────────────────────────────────────────────────────────────┐
│                      Oiduna Core                             │
│  - 256ステップループエンジン                                  │
│  - OSC → SuperDirt                                           │
│  - MIDI出力                                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 5大コンポーネント

### 1. DSLパーサー

**責任**: ユーザーのDSLコードを構造化されたASTに変換

**技術**: Lark (Python parsing library)

**入力**: DSLコードテキスト（例: `.mars` ファイル）

**出力**: AST (Abstract Syntax Tree)

**主要タスク**:
- .lark文法ファイルでDSL構文を定義
- Larkパーサーを初期化
- テキストをパースしてASTノードを生成
- パースエラーをキャッチしてユーザーに報告

**ファイル例**:
```
mars_dsl/
├── grammar/
│   └── mars.lark              # DSL文法定義
├── parser.py                  # Larkパーサー初期化
└── transformers/              # AST変換ロジック
    └── ast_transformer.py
```

**詳細**: [PARSER_INTEGRATION.md](PARSER_INTEGRATION.md)

---

### 2. バリデーター

**責任**: ASTの妥当性を検証（セマンティックチェック）

**入力**: パーサーからのAST

**出力**: Validated AST + エラーリスト

**主要タスク**:
- ASTウォーカーで全ノードを走査
- 変数の未定義参照をチェック
- 型の不一致をチェック
- 値の範囲チェック（例: BPM > 0）
- 音楽理論的な妥当性チェック（Distribution固有）

**バリデーション段階**:
1. **構文レベル** - パーサーが自動的に行う（文法違反）
2. **ASTレベル** - ASTウォーカーで行う（セマンティック）
3. **IR生成前** - Pydanticバリデーション（型・範囲）

**ファイル例**:
```
mars_dsl/
└── validators/
    ├── ast_validator.py       # ASTウォーカー
    ├── semantic_checker.py    # セマンティックルール
    └── error_reporter.py      # エラーメッセージ生成
```

**詳細**: [VALIDATION_PATTERNS.md](VALIDATION_PATTERNS.md)

---

### 3. IR生成器

**責任**: Validated ASTをOiduna CompiledSessionに変換

**入力**: Validated AST

**出力**: CompiledSession (Pydanticモデル)

**主要タスク**:
- ASTをウォークしてOiduna IRモデルを構築
- Environment設定（BPM、swing等）
- Track設定（音色、パラメータ）
- EventSequence生成（256ステップ展開）
- 音楽理論処理（スケール→ノート番号、度数→MIDI等）
- Pydanticモデルの構築と検証

**変換例**:
```
AST: Section("intro", [Track("kick", pattern=[1,0,0,0])])
  ↓
IR:  CompiledSession(
       environment=Environment(bpm=120),
       tracks={"kick": Track(params=TrackParams(s="bd"))},
       sequences={"kick": EventSequence([Event(step=0), Event(step=4), ...])}
     )
```

**ファイル例**:
```
mars_dsl/
└── compiler/
    ├── ir_generator.py        # メインコンパイラ
    ├── environment_builder.py # Environment構築
    ├── track_builder.py       # Track構築
    └── sequence_builder.py    # EventSequence構築
```

**詳細**: [IR_GENERATION_PATTERNS.md](IR_GENERATION_PATTERNS.md)

---

### 4. API クライアント

**責任**: Oiduna CoreへのHTTP通信

**入力**: CompiledSession (Pydanticモデル)

**出力**: HTTP POST結果、SSEイベント

**主要タスク**:
- CompiledSession.to_dict() でJSON化
- POST /playback/session でセッション送信
- POST /playback/start で再生開始
- GET /stream でSSEストリーミング（位置、状態）
- エラーハンドリング（タイムアウト、接続失敗）

**使用エンドポイント**:
```
POST /playback/session    # セッションロード
POST /playback/start      # 再生開始
POST /playback/stop       # 再生停止
GET  /playback/status     # 状態取得
GET  /stream              # SSEストリーミング
```

**ファイル例**:
```
mars_api/
└── clients/
    └── oiduna_client.py       # HTTP通信クライアント
```

**詳細**: [OIDUNA_API_INTEGRATION.md](OIDUNA_API_INTEGRATION.md)

---

### 5. フロントエンド (Monaco Editor)

**責任**: ユーザーインターフェース

**技術**: Monaco Editor (VS Code同じエディタ)

**主要機能**:
- **コードエディタ** - DSLコード入力
- **シンタックスハイライト** - キーワード・数値の色分け
- **オートコンプリート** - 入力候補表示
- **リアルタイムエラー** - 赤波線でエラー表示
- **再生コントロール** - Start/Stop/Pauseボタン
- **ログペイン** - SSEからのリアルタイム状態表示

**UI構成**:
```
┌─────────────────────────────────────────────┐
│ [File] [Edit] [View]                        │
├─────────────────────────────────────────────┤
│                                             │
│  エディタペイン                              │
│  - Monacoエディタ                            │
│  - シンタックスハイライト                     │
│  - オートコンプリート                        │
│  - エラー表示                                │
│                                             │
├─────────────────────────────────────────────┤
│ [▶ Start] [■ Stop] [⏸ Pause]              │
├─────────────────────────────────────────────┤
│  ログペイン                                  │
│  - 現在位置（Step: 64, Bar: 4）              │
│  - トラック状態                              │
│  - エラーログ                                │
└─────────────────────────────────────────────┘
```

**ファイル例**:
```
frontend/
├── src/
│   ├── components/
│   │   ├── Editor.tsx         # Monacoエディタコンポーネント
│   │   ├── Controls.tsx       # 再生コントロール
│   │   └── LogPanel.tsx       # ログ表示
│   ├── monaco/
│   │   ├── syntax.ts          # シンタックスハイライト定義
│   │   └── completion.ts      # オートコンプリート
│   └── api/
│       └── oiduna.ts          # Oiduna API通信
```

**詳細**: [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md), [MONACO_INTEGRATION.md](MONACO_INTEGRATION.md)

---

## データフロー

### 完全なコンパイル→再生フロー

```
1. ユーザーがDSLコードを書く
   ↓
2. DSLパーサーがASTに変換
   ↓
3. バリデーターが妥当性チェック
   ↓
4. IR生成器がCompiledSessionを生成
   ↓
5. APIクライアントがJSON化してPOST
   ↓
6. Oiduna CoreがCompiledSessionを受け取る
   ↓
7. Oiduna Coreが256ステップループを開始
   ↓
8. SSEストリーミングでリアルタイム状態をフロントエンドに配信
   ↓
9. SuperDirt/MIDIから音が鳴る
```

### データ変換の各ステージ

| ステージ | 入力 | 出力 | 処理 |
|---------|------|------|------|
| 1. パース | DSLテキスト | AST | Lark文法でパース |
| 2. バリデーション | AST | Validated AST + エラー | ASTウォーカー |
| 3. IR生成 | Validated AST | CompiledSession | Pydanticモデル構築 |
| 4. シリアライズ | CompiledSession | JSON | .to_dict() |
| 5. HTTP送信 | JSON | HTTPレスポンス | POST /playback/session |
| 6. Oiduna受信 | JSON | CompiledSession | .from_dict() |
| 7. 再生 | CompiledSession | OSC/MIDIメッセージ | LoopEngine |

---

## 技術スタック

### バックエンド

| コンポーネント | 技術 | 理由 |
|--------------|------|------|
| DSLパーサー | Lark | 高速、EBNF文法、Pythonネイティブ |
| IRモデル | Pydantic | 型安全、バリデーション、JSON変換 |
| HTTP通信 | httpx | 非同期対応、モダンAPI |
| APIサーバー（Distribution側） | FastAPI | 高速、OpenAPI自動生成 |

### フロントエンド

| コンポーネント | 技術 | 理由 |
|--------------|------|------|
| エディタ | Monaco Editor | VS Code同等、高機能 |
| フレームワーク | React/Vue/Svelte | 自由選択 |
| 状態管理 | Redux/Vuex/Context | フレームワーク次第 |
| SSE | EventSource API | ブラウザ標準 |

### 外部依存

- **Oiduna Core** - ループエンジン、OSC/MIDI出力
- **SuperDirt** - 音声合成（SuperCollider）
- **MIDI デバイス** - 外部シンセ・DAW

---

## 責任分離

### Distribution側の責任

✅ **Distribution（このプロジェクト）が担当**:
- DSL構文設計
- DSLパース・コンパイル
- 音楽理論処理（スケール、コード、度数 → MIDIノート番号）
- バリデーション
- Monaco統合
- UI/UX設計

### Oiduna側の責任

✅ **Oiduna Coreが担当**:
- 256ステップループ再生
- タイミング制御（BPM、swing）
- OSC/MIDI出力
- リアルタイム状態管理
- SSE配信

### 重要な境界線

```
Distribution: 音楽理論 → MIDIノート番号に変換
               ↓ (CompiledSession)
Oiduna:       MIDIノート番号 → SuperDirt/MIDI出力
```

**Oidunaは音楽理論を知らない**:
- "Cmajスケール" → Distribution が [60, 62, 64, 65, 67, 69, 71] に変換
- "度数1" → Distribution が 60 (MIDI C4) に変換
- Oidunaは受け取った60をそのままSuperDirtに送る

この分離により：
- ✅ Oidunaはシンプルで高速
- ✅ Distributionは自由に音楽理論を拡張可能
- ✅ 他Distribution（TidalCycles風、Sonic Pi風）も同じOidunaを使える

---

## 拡張性

### 新しいDistributionを作る場合

このアーキテクチャは以下のような別Distributionにも適用可能：

**TidalCycles風Distribution**:
```
DSLパーサー: Haskell風ミニノーテーション
IR生成器:    パターン合成 → EventSequence
フロントエンド: TidalCycles風UI
```

**Sonic Pi風Distribution**:
```
DSLパーサー: Ruby風シンタックス
IR生成器:    live_loop → EventSequence
フロントエンド: Sonic Pi風UI
```

**必要な変更**:
1. .lark文法を書き換え（構文設計）
2. IR生成器を書き換え（AST → CompiledSession変換）
3. Monaco定義を書き換え（シンタックスハイライト）
4. **Oiduna API連携は変更不要**

---

## 関連ドキュメント

### このリファレンス内

- [PARSER_INTEGRATION.md](PARSER_INTEGRATION.md) - Lark統合方法
- [VALIDATION_PATTERNS.md](VALIDATION_PATTERNS.md) - バリデーション実装
- [IR_GENERATION_PATTERNS.md](IR_GENERATION_PATTERNS.md) - IR生成パターン
- [OIDUNA_API_INTEGRATION.md](OIDUNA_API_INTEGRATION.md) - API連携
- [MONACO_INTEGRATION.md](MONACO_INTEGRATION.md) - Monaco統合
- [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) - フロントエンド設計

### Oidunaドキュメント

- [Oiduna Architecture](../../../../oiduna/docs/ARCHITECTURE.md) - Oidunaの内部構造
- [Data Model Reference](../../../../oiduna/docs/DATA_MODEL_REFERENCE.md) - CompiledSession完全仕様
- [API Reference](../../../../oiduna/docs/API_REFERENCE.md) - HTTPエンドポイント仕様

### ワークスペースドキュメント

- [ADR-001: Separation of Concerns](../../../../docs/ADR/001-separation-of-concerns.md) - 分離の設計判断

---

**Last Updated**: 2026-02-24
**Scope**: DSL非依存のアーキテクチャパターン
**Status**: ✅ 完成
