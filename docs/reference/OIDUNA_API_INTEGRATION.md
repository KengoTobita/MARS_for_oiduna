# Oiduna API Integration

**対象読者**: Distribution開発者
**目的**: Oiduna CoreとのHTTP通信方法を理解する

このドキュメントは**DSL非依存**です。どのDistributionでも同じAPI連携パターンを使用できます。

---

## 目次

1. [概要](#概要)
2. [使用エンドポイント](#使用エンドポイント)
3. [クライアント実装](#クライアント実装)
4. [SSEストリーミング](#sseストリーミング)
5. [エラーハンドリング](#エラーハンドリング)
6. [実装例](#実装例)

---

## 概要

### Oiduna APIの役割

DistributionはOiduna CoreとHTTP REST API経由で通信します：

```
┌──────────────────────┐
│    Distribution      │
│  (MARS/TidalCycles)  │
│                      │
│  CompiledSession生成 │
└──────────┬───────────┘
           │
           │ HTTP POST /playback/session
           │ Content-Type: application/json
           ↓
┌──────────────────────┐
│    Oiduna Core       │
│                      │
│  256-step loop       │
│  OSC/MIDI output     │
└──────────────────────┘
```

### 通信プロトコル

- **プロトコル**: HTTP/1.1
- **データ形式**: JSON
- **リアルタイム通信**: Server-Sent Events (SSE)
- **デフォルトURL**: `http://localhost:57122`

### なぜHTTP?

Oidunaは**ZeroMQではなくHTTP**を採用しています：

✅ **利点**:
- 言語非依存（Python、Rust、JavaScript等どれでも）
- デバッグが簡単（curl、ブラウザで確認可能）
- ファイアウォールフレンドリー
- OpenAPI自動ドキュメント生成

❌ **欠点**:
- ZeroMQよりレイテンシがやや高い（1-2ms）
- しかし256ステップループ（31ms/step @ 120BPM）では十分

参考: [ADR-002: HTTP API Choice](../../../../docs/ADR/002-http-api-choice.md)

---

## 使用エンドポイント

### 必須エンドポイント

Distribution実装で**必ず使用する**エンドポイント：

#### 1. POST /playback/session

**目的**: CompiledSessionをロード

**リクエスト**:
```http
POST /playback/session HTTP/1.1
Host: localhost:57122
Content-Type: application/json

{
  "environment": {
    "bpm": 120.0,
    "default_gate": 1.0,
    "swing": 0.0,
    "loop_steps": 256
  },
  "tracks": {
    "kick": {
      "meta": {"track_id": "kick", "mute": false, "solo": false},
      "params": {"s": "bd", "gain": 1.0, "pan": 0.5, "orbit": 0},
      "fx": {},
      "track_fx": {},
      "sends": [],
      "modulations": {}
    }
  },
  "tracks_midi": {},
  "mixer_lines": {},
  "sequences": {
    "kick": {
      "track_id": "kick",
      "events": [
        {"step": 0, "velocity": 1.0, "gate": 1.0},
        {"step": 4, "velocity": 1.0, "gate": 1.0}
      ]
    }
  },
  "scenes": {},
  "apply": {
    "timing": "bar",
    "track_ids": [],
    "scene_name": null
  }
}
```

**レスポンス** (200 OK):
```json
{
  "status": "ok",
  "message": "Session loaded successfully"
}
```

**エラー** (422 Unprocessable Entity):
```json
{
  "detail": [
    {
      "type": "greater_than",
      "loc": ["body", "environment", "bpm"],
      "msg": "Input should be greater than 0",
      "input": -10
    }
  ]
}
```

#### 2. POST /playback/start

**目的**: 再生開始

**リクエスト**:
```http
POST /playback/start HTTP/1.1
Host: localhost:57122
```

**レスポンス** (200 OK):
```json
{
  "status": "ok",
  "playing": true
}
```

#### 3. POST /playback/stop

**目的**: 再生停止

**リクエスト**:
```http
POST /playback/stop HTTP/1.1
Host: localhost:57122
```

**レスポンス** (200 OK):
```json
{
  "status": "ok",
  "playing": false
}
```

### オプショナルエンドポイント

必須ではないが便利なエンドポイント：

#### 4. GET /playback/status

**目的**: 現在の再生状態を取得

**レスポンス** (200 OK):
```json
{
  "playing": true,
  "playback_state": "playing",
  "bpm": 120.0,
  "position": {
    "step": 64,
    "beat": 16,
    "bar": 4
  },
  "active_tracks": ["kick", "snare", "hihat"],
  "has_pending": false,
  "scenes": ["intro", "verse"],
  "current_scene": "verse"
}
```

#### 5. POST /playback/pause

**目的**: 一時停止（/startで再開）

**レスポンス** (200 OK):
```json
{
  "status": "ok",
  "playing": false,
  "paused": true
}
```

#### 6. PATCH /playback/environment

**目的**: BPM等のグローバル設定を更新

**リクエスト**:
```json
{
  "bpm": 140.0,
  "swing": 0.1
}
```

**レスポンス** (200 OK):
```json
{
  "status": "ok",
  "environment": {
    "bpm": 140.0,
    "swing": 0.1,
    "default_gate": 1.0,
    "loop_steps": 256
  }
}
```

### 全エンドポイント一覧

詳細は [Oiduna API Reference](../../../../oiduna/docs/API_REFERENCE.md) を参照。

---

## クライアント実装

### Python実装例

```python
import httpx
from typing import Any

class OidunaClient:
    """Distribution側からOiduna Coreに接続するクライアント"""

    def __init__(self, base_url: str = "http://localhost:57122"):
        self.base_url = base_url
        self.client = httpx.Client(base_url=base_url, timeout=10.0)

    def load_session(self, compiled_session) -> dict[str, Any]:
        """CompiledSessionをOidunaに送信"""
        payload = compiled_session.to_dict()
        resp = self.client.post("/playback/session", json=payload)
        resp.raise_for_status()
        return resp.json()

    def start(self) -> dict[str, Any]:
        """再生開始"""
        resp = self.client.post("/playback/start")
        resp.raise_for_status()
        return resp.json()

    def stop(self) -> dict[str, Any]:
        """再生停止"""
        resp = self.client.post("/playback/stop")
        resp.raise_for_status()
        return resp.json()

    def pause(self) -> dict[str, Any]:
        """一時停止"""
        resp = self.client.post("/playback/pause")
        resp.raise_for_status()
        return resp.json()

    def get_status(self) -> dict[str, Any]:
        """現在の状態を取得"""
        resp = self.client.get("/playback/status")
        resp.raise_for_status()
        return resp.json()

    def update_environment(self, **kwargs) -> dict[str, Any]:
        """Environment設定を更新（例: bpm=140）"""
        resp = self.client.patch("/playback/environment", json=kwargs)
        resp.raise_for_status()
        return resp.json()

    def close(self):
        """接続を閉じる"""
        self.client.close()
```

### 使用例

```python
from oiduna_core.models.ir import (
    CompiledSession, Environment,
    Track, TrackMeta, TrackParams,
    EventSequence, Event,
)

# 1. CompiledSessionを生成
events = [Event(step=i * 4, velocity=1.0) for i in range(64)]

session = CompiledSession(
    environment=Environment(bpm=120.0),
    tracks={
        "kick": Track(
            meta=TrackMeta(track_id="kick"),
            params=TrackParams(s="bd", orbit=0),
        )
    },
    sequences={
        "kick": EventSequence.from_events("kick", events)
    },
)

# 2. Oidunaクライアントを初期化
client = OidunaClient()

# 3. セッションを送信
try:
    result = client.load_session(session)
    print(f"Session loaded: {result}")

    # 4. 再生開始
    result = client.start()
    print(f"Started: {result}")

    # 5. 状態確認
    status = client.get_status()
    print(f"Status: {status}")

except httpx.HTTPStatusError as e:
    print(f"HTTP error: {e.response.status_code} - {e.response.text}")
except httpx.RequestError as e:
    print(f"Connection error: {e}")
finally:
    client.close()
```

### JavaScript実装例

```javascript
class OidunaClient {
  constructor(baseUrl = 'http://localhost:57122') {
    this.baseUrl = baseUrl;
  }

  async loadSession(compiledSession) {
    const resp = await fetch(`${this.baseUrl}/playback/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(compiledSession)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
    return resp.json();
  }

  async start() {
    const resp = await fetch(`${this.baseUrl}/playback/start`, { method: 'POST' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }

  async stop() {
    const resp = await fetch(`${this.baseUrl}/playback/stop`, { method: 'POST' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }

  async getStatus() {
    const resp = await fetch(`${this.baseUrl}/playback/status`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }
}

// 使用例
const client = new OidunaClient();

const session = {
  environment: { bpm: 120.0, default_gate: 1.0, swing: 0.0, loop_steps: 256 },
  tracks: {
    kick: {
      meta: { track_id: 'kick', mute: false, solo: false },
      params: { s: 'bd', gain: 1.0, pan: 0.5, orbit: 0 },
      fx: {},
      track_fx: {},
      sends: [],
      modulations: {}
    }
  },
  tracks_midi: {},
  mixer_lines: {},
  sequences: {
    kick: {
      track_id: 'kick',
      events: [
        { step: 0, velocity: 1.0, gate: 1.0 },
        { step: 4, velocity: 1.0, gate: 1.0 }
      ]
    }
  },
  scenes: {},
  apply: { timing: 'bar', track_ids: [], scene_name: null }
};

try {
  await client.loadSession(session);
  await client.start();
  const status = await client.getStatus();
  console.log('Status:', status);
} catch (err) {
  console.error('Error:', err);
}
```

---

## SSEストリーミング

### Server-Sent Events (SSE)

Oidunaはリアルタイム状態更新をSSEで配信します。

#### エンドポイント

```
GET /stream
Accept: text/event-stream
```

#### イベント種類

| イベント名 | 頻度 | 内容 |
|----------|------|------|
| `connected` | 1回（接続時） | 接続確認 |
| `position` | 毎ステップ | step, beat, bar位置 |
| `status` | 状態変更時 | playing, playback_state |
| `tracks` | トラック変更時 | active_tracks一覧 |
| `heartbeat` | 15秒毎 | キープアライブ |
| `error` | エラー発生時 | エラーメッセージ |

#### Python実装例

```python
import httpx

def listen_to_oiduna_stream(base_url: str = "http://localhost:57122"):
    """Oiduna SSEストリームを購読"""
    with httpx.stream("GET", f"{base_url}/stream", timeout=None) as resp:
        for line in resp.iter_lines():
            if line.startswith("event:"):
                event_type = line.split(":", 1)[1].strip()
            elif line.startswith("data:"):
                data = line.split(":", 1)[1].strip()
                handle_event(event_type, data)

def handle_event(event_type: str, data: str):
    import json
    data_obj = json.loads(data)

    if event_type == "position":
        print(f"Position: step={data_obj['step']}, bar={data_obj['bar']}")
    elif event_type == "status":
        print(f"Status: playing={data_obj['playing']}")
    elif event_type == "error":
        print(f"Error: {data_obj['message']}")

# 使用例
listen_to_oiduna_stream()
```

#### JavaScript実装例

```javascript
const eventSource = new EventSource('http://localhost:57122/stream');

eventSource.addEventListener('position', (e) => {
  const pos = JSON.parse(e.data);
  console.log(`Position: step=${pos.step}, bar=${pos.bar}`);
  updateUI(pos);
});

eventSource.addEventListener('status', (e) => {
  const status = JSON.parse(e.data);
  console.log(`Status: playing=${status.playing}`);
});

eventSource.addEventListener('error', (e) => {
  const error = JSON.parse(e.data);
  console.error(`Oiduna error: ${error.message}`);
});

eventSource.onerror = (err) => {
  console.error('SSE connection error:', err);
  eventSource.close();
};
```

---

## エラーハンドリング

### HTTPステータスコード

| コード | 意味 | 対処法 |
|-------|------|--------|
| 200 | 成功 | 正常処理 |
| 400 | 不正なリクエスト | リクエストボディを確認 |
| 404 | Not Found | エンドポイントURLを確認 |
| 422 | バリデーションエラー | CompiledSessionの内容を確認 |
| 500 | サーバーエラー | Oidunaログを確認 |

### バリデーションエラー（422）

Pydanticバリデーションに失敗した場合：

**エラーレスポンス例**:
```json
{
  "detail": [
    {
      "type": "greater_than",
      "loc": ["body", "environment", "bpm"],
      "msg": "Input should be greater than 0",
      "input": -10
    },
    {
      "type": "missing",
      "loc": ["body", "tracks", "kick", "params", "s"],
      "msg": "Field required"
    }
  ]
}
```

**対処法**:
1. `loc`（location）フィールドでエラー箇所を特定
2. `msg`でエラー内容を確認
3. CompiledSession生成コードを修正

### 接続エラー

```python
try:
    client.load_session(session)
except httpx.ConnectError:
    print("Oiduna Coreに接続できません")
    print("1. Oidunaが起動していますか？")
    print("2. ポート57122が空いていますか？")
    print("3. ファイアウォールでブロックされていませんか？")
except httpx.TimeoutException:
    print("Oidunaからの応答がタイムアウトしました")
    print("1. Oidunaが応答不能になっていませんか？")
    print("2. ネットワークが遅すぎませんか？")
```

### リトライ戦略

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10)
)
def load_session_with_retry(client, session):
    """リトライ付きセッションロード"""
    return client.load_session(session)

# 使用例
try:
    result = load_session_with_retry(client, session)
except Exception as e:
    print(f"3回リトライしても失敗: {e}")
```

---

## 実装例

### 最小限の完全な例

```python
from oiduna_core.models.ir import (
    CompiledSession, Environment,
    Track, TrackMeta, TrackParams, FxParams, TrackFxParams,
    EventSequence, Event, ApplyCommand,
)
import httpx

def create_simple_session() -> CompiledSession:
    """キック4つ打ちの最小セッション"""
    # キック: 4ステップごとに打つ（0, 4, 8, 12, ...）
    kick_events = [
        Event(step=i * 4, velocity=1.0, gate=1.0)
        for i in range(64)  # 256 steps / 4 = 64 events
    ]

    return CompiledSession(
        environment=Environment(bpm=120.0),
        tracks={
            "kick": Track(
                meta=TrackMeta(track_id="kick"),
                params=TrackParams(s="bd", gain=0.8, pan=0.5, orbit=0),
                fx=FxParams(),
                track_fx=TrackFxParams(),
                sends=tuple(),
                modulations={},
            )
        },
        tracks_midi={},
        mixer_lines={},
        sequences={
            "kick": EventSequence.from_events("kick", kick_events)
        },
        scenes={},
        apply=ApplyCommand(timing="bar", track_ids=[], scene_name=None),
    )

def main():
    # 1. セッション生成
    session = create_simple_session()

    # 2. Oidunaクライアント初期化
    client = httpx.Client(base_url="http://localhost:57122", timeout=10.0)

    try:
        # 3. セッション送信
        resp = client.post("/playback/session", json=session.to_dict())
        resp.raise_for_status()
        print(f"✅ Session loaded: {resp.json()}")

        # 4. 再生開始
        resp = client.post("/playback/start")
        resp.raise_for_status()
        print(f"✅ Started: {resp.json()}")

        # 5. 状態確認
        resp = client.get("/playback/status")
        status = resp.json()
        print(f"✅ Status: step={status['position']['step']}, bar={status['position']['bar']}")

    except httpx.HTTPStatusError as e:
        print(f"❌ HTTP error: {e.response.status_code}")
        print(f"   Response: {e.response.text}")
    except httpx.RequestError as e:
        print(f"❌ Connection error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    main()
```

---

## 関連ドキュメント

### このリファレンス内

- [ARCHITECTURE.md](ARCHITECTURE.md) - 全体像
- [IR_GENERATION_PATTERNS.md](IR_GENERATION_PATTERNS.md) - CompiledSession生成

### Oidunaドキュメント

- **[API Reference](../../../../oiduna/docs/API_REFERENCE.md)** - 全エンドポイント詳細
- [Data Model Reference](../../../../oiduna/docs/DATA_MODEL_REFERENCE.md) - CompiledSession完全仕様
- [Distribution Guide](../../../../oiduna/docs/DISTRIBUTION_GUIDE.md) - Distribution実装ガイド

---

**Last Updated**: 2026-02-24
**Scope**: DSL非依存のAPI連携パターン
**Status**: ✅ 完成
