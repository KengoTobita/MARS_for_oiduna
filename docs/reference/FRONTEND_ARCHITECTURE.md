# Frontend Architecture

**対象読者**: Distribution開発者
**目的**: フロントエンドの設計パターンとUI構成を理解する

このドキュメントは**DSL非依存**です。MARS固有のUIには言及せず、汎用的なフロントエンドパターンを説明します。

---

## 目次

1. [概要](#概要)
2. [UI コンポーネント構造](#uiコンポーネント構造)
3. [状態管理パターン](#状態管理パターン)
4. [リアルタイムフィードバック](#リアルタイムフィードバック)
5. [フレームワーク別実装](#フレームワーク別実装)
6. [コンパイル→再生ワークフロー](#コンパイル再生ワークフロー)
7. [実装例](#実装例)

---

## 概要

### フロントエンドの役割

Distribution実装において、フロントエンドは以下の責任を持ちます：

```
┌──────────────────────────────────────────┐
│            Frontend Layer                │
│                                          │
│  1. コード編集 (Monaco Editor)            │
│     - DSL入力                            │
│     - シンタックスハイライト              │
│     - オートコンプリート                  │
│                                          │
│  2. 再生コントロール                      │
│     - Start/Stop/Pauseボタン             │
│     - BPMスライダー                       │
│     - ボリュームコントロール              │
│                                          │
│  3. リアルタイム状態表示                  │
│     - 現在位置（ステップ、小節）          │
│     - トラック状態                        │
│     - エラーログ                          │
│                                          │
│  4. バックエンド連携                      │
│     - コンパイルAPI呼び出し               │
│     - 再生API呼び出し                     │
│     - SSEストリーミング受信               │
│                                          │
└──────────────────────────────────────────┘
```

### 主要な設計目標

✅ **リアルタイム性**:
- エディタの変更を即座にバリデーション
- 再生中の状態をリアルタイム表示
- 低レイテンシーのフィードバック

✅ **使いやすさ**:
- 直感的なUI配置
- キーボードショートカット
- エラーの分かりやすい表示

✅ **拡張性**:
- プラグイン可能なエディタ機能
- カスタマイズ可能なテーマ
- モジュール化されたコンポーネント

---

## UIコンポーネント構造

### 基本レイアウト

```
┌───────────────────────────────────────────────────────────┐
│ Header                                                    │
│ [Logo] [File] [Edit] [View] [Help]                       │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ Editor Pane (Monaco Editor)                              │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ 1  // Your DSL code here                            │  │
│ │ 2  track kick {                                     │  │
│ │ 3    pattern: [1, 0, 0, 0]                          │  │
│ │ 4  }                                                │  │
│ │ 5                                                   │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                           │
├───────────────────────────────────────────────────────────┤
│ Controls Bar                                              │
│ [▶ Start] [■ Stop] [⏸ Pause]  BPM: [120]  Vol: [━━━━━]  │
├───────────────────────────────────────────────────────────┤
│ Log Pane                                                  │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ [INFO] Compiled successfully                        │  │
│ │ [INFO] Playback started                             │  │
│ │ [DEBUG] Step: 64, Bar: 4, Beat: 1                   │  │
│ │ [ERROR] Undefined variable: 'snare'                 │  │
│ └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

### コンポーネント分割

```
App
├── Header
│   ├── Logo
│   ├── MenuBar
│   └── UserInfo
│
├── EditorPane
│   ├── MonacoEditor
│   ├── LineNumbers
│   └── ErrorMarkers
│
├── ControlsBar
│   ├── PlaybackButtons
│   │   ├── StartButton
│   │   ├── StopButton
│   │   └── PauseButton
│   ├── BPMControl
│   └── VolumeControl
│
└── LogPane
    ├── LogFilter
    └── LogList
```

### 推奨UI構成

| ペイン | 推奨サイズ | 役割 |
|-------|----------|------|
| Header | 固定 60px | メニュー、ロゴ |
| Editor | フレキシブル（60-80%） | コード編集 |
| Controls | 固定 80px | 再生コントロール |
| Log | フレキシブル（20-40%） | 状態表示、ログ |

---

## 状態管理パターン

### 状態の種類

```typescript
interface AppState {
  // エディタ状態
  editor: {
    code: string;
    cursorPosition: { line: number; column: number };
    errors: ValidationError[];
  };

  // 再生状態
  playback: {
    status: 'stopped' | 'playing' | 'paused';
    currentStep: number;
    currentBar: number;
    bpm: number;
  };

  // セッション状態
  session: {
    loaded: boolean;
    compiledAt: Date | null;
    compilationErrors: CompilationError[];
  };

  // UI状態
  ui: {
    logPaneVisible: boolean;
    theme: 'dark' | 'light';
  };
}
```

### React (Context API)

```typescript
import React, { createContext, useContext, useReducer } from 'react';

// State型定義
type AppState = {
  code: string;
  playbackStatus: 'stopped' | 'playing' | 'paused';
  currentStep: number;
  bpm: number;
};

// Action型定義
type AppAction =
  | { type: 'SET_CODE'; payload: string }
  | { type: 'SET_PLAYBACK_STATUS'; payload: 'stopped' | 'playing' | 'paused' }
  | { type: 'UPDATE_POSITION'; payload: { step: number } }
  | { type: 'SET_BPM'; payload: number };

// 初期状態
const initialState: AppState = {
  code: '',
  playbackStatus: 'stopped',
  currentStep: 0,
  bpm: 120,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CODE':
      return { ...state, code: action.payload };
    case 'SET_PLAYBACK_STATUS':
      return { ...state, playbackStatus: action.payload };
    case 'UPDATE_POSITION':
      return { ...state, currentStep: action.payload.step };
    case 'SET_BPM':
      return { ...state, bpm: action.payload };
    default:
      return state;
  }
}

// Context作成
const AppStateContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<React.Dispatch<AppAction> | undefined>(undefined);

// Provider
export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
};

// Hooks
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within AppStateProvider');
  return context;
};

export const useAppDispatch = () => {
  const context = useContext(AppDispatchContext);
  if (!context) throw new Error('useAppDispatch must be used within AppStateProvider');
  return context;
};
```

### Vue (Pinia)

```typescript
import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
  state: () => ({
    code: '',
    playbackStatus: 'stopped' as 'stopped' | 'playing' | 'paused',
    currentStep: 0,
    bpm: 120,
    errors: [] as ValidationError[],
  }),

  getters: {
    isPlaying: (state) => state.playbackStatus === 'playing',
    currentBar: (state) => Math.floor(state.currentStep / 16),
  },

  actions: {
    setCode(code: string) {
      this.code = code;
    },

    setPlaybackStatus(status: 'stopped' | 'playing' | 'paused') {
      this.playbackStatus = status;
    },

    updatePosition(step: number) {
      this.currentStep = step;
    },

    setBPM(bpm: number) {
      this.bpm = bpm;
    },

    addError(error: ValidationError) {
      this.errors.push(error);
    },

    clearErrors() {
      this.errors = [];
    },
  },
});
```

### Vanilla JavaScript (Observable Pattern)

```typescript
class AppStore {
  private state: AppState;
  private listeners: Set<(state: AppState) => void> = new Set();

  constructor(initialState: AppState) {
    this.state = initialState;
  }

  getState(): AppState {
    return { ...this.state };
  }

  setState(updates: Partial<AppState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  subscribe(listener: (state: AppState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.getState()));
  }
}

// 使用例
const store = new AppStore({
  code: '',
  playbackStatus: 'stopped',
  currentStep: 0,
  bpm: 120,
});

// 購読
const unsubscribe = store.subscribe((state) => {
  console.log('State changed:', state);
});

// 状態更新
store.setState({ code: 'track kick { }' });
store.setState({ playbackStatus: 'playing' });
```

---

## リアルタイムフィードバック

### SSE (Server-Sent Events) 統合

```typescript
class OidunaSSEClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect(url: string) {
    this.eventSource = new EventSource(url);

    // 位置更新イベント
    this.eventSource.addEventListener('position', (e) => {
      const data = JSON.parse(e.data);
      this.emit('position', data);
    });

    // トラック状態イベント
    this.eventSource.addEventListener('track_state', (e) => {
      const data = JSON.parse(e.data);
      this.emit('track_state', data);
    });

    // エラーイベント
    this.eventSource.addEventListener('error', (e) => {
      console.error('SSE error:', e);
      this.emit('error', e);
    });
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  on(eventName: string, callback: (data: any) => void) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(callback);
  }

  off(eventName: string, callback: (data: any) => void) {
    this.listeners.get(eventName)?.delete(callback);
  }

  private emit(eventName: string, data: any) {
    this.listeners.get(eventName)?.forEach(callback => callback(data));
  }
}
```

### React統合例

```typescript
import { useEffect, useState } from 'react';

export const useOidunaSSE = (url: string) => {
  const [position, setPosition] = useState({ step: 0, bar: 0, beat: 0 });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const client = new OidunaSSEClient();

    client.on('position', (data) => {
      setPosition({
        step: data.step,
        bar: data.bar,
        beat: data.beat,
      });
    });

    client.on('error', () => {
      setIsConnected(false);
    });

    client.connect(url);
    setIsConnected(true);

    return () => {
      client.disconnect();
    };
  }, [url]);

  return { position, isConnected };
};

// コンポーネントで使用
function LogPane() {
  const { position, isConnected } = useOidunaSSE('http://localhost:8000/stream');

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>Step: {position.step}</div>
      <div>Bar: {position.bar}</div>
      <div>Beat: {position.beat}</div>
    </div>
  );
}
```

### Vue統合例

```vue
<template>
  <div>
    <div>Status: {{ isConnected ? 'Connected' : 'Disconnected' }}</div>
    <div>Step: {{ position.step }}</div>
    <div>Bar: {{ position.bar }}</div>
    <div>Beat: {{ position.beat }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const position = ref({ step: 0, bar: 0, beat: 0 });
const isConnected = ref(false);

let client: OidunaSSEClient | null = null;

onMounted(() => {
  client = new OidunaSSEClient();

  client.on('position', (data) => {
    position.value = {
      step: data.step,
      bar: data.bar,
      beat: data.beat,
    };
  });

  client.connect('http://localhost:8000/stream');
  isConnected.value = true;
});

onUnmounted(() => {
  client?.disconnect();
});
</script>
```

---

## フレームワーク別実装

### React実装例

```tsx
import React, { useState } from 'react';
import * as monaco from 'monaco-editor';
import { MonacoEditor } from './components/MonacoEditor';
import { ControlsBar } from './components/ControlsBar';
import { LogPane } from './components/LogPane';
import { OidunaClient } from './api/oiduna';

const App: React.FC = () => {
  const [code, setCode] = useState('// Write your DSL code here');
  const [playbackStatus, setPlaybackStatus] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const oidunaClient = new OidunaClient('http://localhost:8000');

  const handleCompile = async () => {
    try {
      // コンパイルAPI呼び出し
      const response = await oidunaClient.compile(code);

      if (response.errors.length > 0) {
        setErrors(response.errors);
      } else {
        setErrors([]);
        console.log('Compilation successful');
      }
    } catch (error) {
      console.error('Compilation failed:', error);
    }
  };

  const handleStart = async () => {
    await oidunaClient.start();
    setPlaybackStatus('playing');
  };

  const handleStop = async () => {
    await oidunaClient.stop();
    setPlaybackStatus('stopped');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Distribution Editor</h1>
      </header>

      <div className="editor-pane">
        <MonacoEditor
          value={code}
          onChange={setCode}
          errors={errors}
          onCompile={handleCompile}
        />
      </div>

      <ControlsBar
        playbackStatus={playbackStatus}
        onStart={handleStart}
        onStop={handleStop}
      />

      <LogPane />
    </div>
  );
};

export default App;
```

### Vue実装例

```vue
<template>
  <div class="app">
    <header class="header">
      <h1>Distribution Editor</h1>
    </header>

    <div class="editor-pane">
      <MonacoEditor
        v-model="code"
        :errors="errors"
        @compile="handleCompile"
      />
    </div>

    <ControlsBar
      :playback-status="playbackStatus"
      @start="handleStart"
      @stop="handleStop"
    />

    <LogPane />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import MonacoEditor from './components/MonacoEditor.vue';
import ControlsBar from './components/ControlsBar.vue';
import LogPane from './components/LogPane.vue';
import { OidunaClient } from './api/oiduna';

const code = ref('// Write your DSL code here');
const playbackStatus = ref<'stopped' | 'playing' | 'paused'>('stopped');
const errors = ref<ValidationError[]>([]);

const oidunaClient = new OidunaClient('http://localhost:8000');

const handleCompile = async () => {
  try {
    const response = await oidunaClient.compile(code.value);

    if (response.errors.length > 0) {
      errors.value = response.errors;
    } else {
      errors.value = [];
      console.log('Compilation successful');
    }
  } catch (error) {
    console.error('Compilation failed:', error);
  }
};

const handleStart = async () => {
  await oidunaClient.start();
  playbackStatus.value = 'playing';
};

const handleStop = async () => {
  await oidunaClient.stop();
  playbackStatus.value = 'stopped';
};
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header {
  height: 60px;
  background: #1e1e1e;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.editor-pane {
  flex: 1;
  overflow: auto;
}
</style>
```

### Vanilla JavaScript実装例

```typescript
class App {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private oidunaClient: OidunaClient;
  private playbackStatus: 'stopped' | 'playing' | 'paused' = 'stopped';

  constructor() {
    this.oidunaClient = new OidunaClient('http://localhost:8000');
    this.init();
  }

  private init() {
    // Monaco Editor初期化
    this.editor = monaco.editor.create(
      document.getElementById('editor')!,
      {
        value: '// Write your DSL code here',
        language: 'mydsl',
        theme: 'vs-dark',
      }
    );

    // ボタンイベント
    document.getElementById('compile-btn')!.addEventListener('click', () => {
      this.handleCompile();
    });

    document.getElementById('start-btn')!.addEventListener('click', () => {
      this.handleStart();
    });

    document.getElementById('stop-btn')!.addEventListener('click', () => {
      this.handleStop();
    });

    // エディタ変更イベント
    this.editor.onDidChangeModelContent(() => {
      this.handleCodeChange();
    });
  }

  private async handleCompile() {
    const code = this.editor.getValue();

    try {
      const response = await this.oidunaClient.compile(code);

      if (response.errors.length > 0) {
        this.displayErrors(response.errors);
      } else {
        this.clearErrors();
        this.log('Compilation successful');
      }
    } catch (error) {
      this.log(`Compilation failed: ${error}`, 'error');
    }
  }

  private async handleStart() {
    await this.oidunaClient.start();
    this.playbackStatus = 'playing';
    this.updateUI();
  }

  private async handleStop() {
    await this.oidunaClient.stop();
    this.playbackStatus = 'stopped';
    this.updateUI();
  }

  private handleCodeChange() {
    // デバウンス付きバリデーション
    clearTimeout(this.validationTimeout);
    this.validationTimeout = window.setTimeout(() => {
      this.validateCode();
    }, 300);
  }

  private displayErrors(errors: ValidationError[]) {
    monaco.editor.setModelMarkers(
      this.editor.getModel()!,
      'mydsl',
      errors.map(err => ({
        severity: monaco.MarkerSeverity.Error,
        startLineNumber: err.line,
        startColumn: err.column,
        endLineNumber: err.line,
        endColumn: err.column + err.length,
        message: err.message,
      }))
    );
  }

  private clearErrors() {
    monaco.editor.setModelMarkers(this.editor.getModel()!, 'mydsl', []);
  }

  private log(message: string, level: 'info' | 'error' = 'info') {
    const logPane = document.getElementById('log-pane')!;
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${level}`;
    logEntry.textContent = `[${level.toUpperCase()}] ${message}`;
    logPane.appendChild(logEntry);
  }

  private updateUI() {
    // UI更新
    const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;

    startBtn.disabled = this.playbackStatus === 'playing';
    stopBtn.disabled = this.playbackStatus === 'stopped';
  }
}

// アプリ起動
new App();
```

---

## コンパイル→再生ワークフロー

### 完全なワークフロー

```
1. ユーザーがコードを書く
   ↓
2. エディタ変更イベント発火
   ↓
3. デバウンス（300ms）
   ↓
4. バリデーションAPI呼び出し
   ↓
5. エラーマーカー表示/クリア
   ↓
6. ユーザーが "Compile" ボタンクリック
   ↓
7. コンパイルAPI呼び出し (POST /compile)
   ↓
8. CompiledSession生成
   ↓
9. Oidunaに送信 (POST /playback/session)
   ↓
10. ユーザーが "Start" ボタンクリック
    ↓
11. 再生開始 (POST /playback/start)
    ↓
12. SSE接続 (GET /stream)
    ↓
13. リアルタイム位置更新受信
    ↓
14. UI更新（ステップ、小節表示）
```

### APIクライアント実装

```typescript
class OidunaClient {
  constructor(private baseUrl: string) {}

  async compile(code: string): Promise<CompileResponse> {
    const response = await fetch(`${this.baseUrl}/api/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error(`Compilation failed: ${response.statusText}`);
    }

    return response.json();
  }

  async loadSession(sessionData: CompiledSession): Promise<void> {
    const response = await fetch(`${this.baseUrl}/playback/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });

    if (!response.ok) {
      throw new Error(`Failed to load session: ${response.statusText}`);
    }
  }

  async start(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/playback/start`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to start playback: ${response.statusText}`);
    }
  }

  async stop(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/playback/stop`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to stop playback: ${response.statusText}`);
    }
  }

  async getStatus(): Promise<PlaybackStatus> {
    const response = await fetch(`${this.baseUrl}/playback/status`);

    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`);
    }

    return response.json();
  }

  connectSSE(
    onPosition: (data: PositionData) => void,
    onError: (error: Event) => void
  ): () => void {
    const eventSource = new EventSource(`${this.baseUrl}/stream`);

    eventSource.addEventListener('position', (e) => {
      const data = JSON.parse(e.data);
      onPosition(data);
    });

    eventSource.addEventListener('error', onError);

    // クリーンアップ関数を返す
    return () => eventSource.close();
  }
}

// 型定義
interface CompileResponse {
  success: boolean;
  errors: ValidationError[];
  session?: CompiledSession;
}

interface PlaybackStatus {
  status: 'stopped' | 'playing' | 'paused';
  currentStep: number;
  bpm: number;
}

interface PositionData {
  step: number;
  bar: number;
  beat: number;
}
```

---

## 実装例

### フル統合例（React + TypeScript）

```tsx
// App.tsx
import React, { useState, useEffect } from 'react';
import { MonacoEditor } from './components/MonacoEditor';
import { ControlsBar } from './components/ControlsBar';
import { LogPane } from './components/LogPane';
import { OidunaClient } from './api/oiduna';
import './App.css';

const App: React.FC = () => {
  const [code, setCode] = useState('// Write your DSL code here');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [playbackStatus, setPlaybackStatus] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  const [position, setPosition] = useState({ step: 0, bar: 0, beat: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const client = new OidunaClient('http://localhost:8000');

  useEffect(() => {
    // SSE接続
    const disconnect = client.connectSSE(
      (data) => {
        setPosition(data);
      },
      (error) => {
        addLog('SSE connection error', 'error');
      }
    );

    return () => disconnect();
  }, []);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleCompile = async () => {
    try {
      addLog('Compiling...', 'info');
      const response = await client.compile(code);

      if (response.errors.length > 0) {
        setErrors(response.errors);
        addLog(`Compilation failed: ${response.errors.length} errors`, 'error');
      } else {
        setErrors([]);
        await client.loadSession(response.session!);
        addLog('Compilation successful', 'success');
      }
    } catch (error) {
      addLog(`Compilation error: ${error}`, 'error');
    }
  };

  const handleStart = async () => {
    try {
      await client.start();
      setPlaybackStatus('playing');
      addLog('Playback started', 'info');
    } catch (error) {
      addLog(`Failed to start: ${error}`, 'error');
    }
  };

  const handleStop = async () => {
    try {
      await client.stop();
      setPlaybackStatus('stopped');
      addLog('Playback stopped', 'info');
    } catch (error) {
      addLog(`Failed to stop: ${error}`, 'error');
    }
  };

  const addLog = (message: string, level: 'info' | 'error' | 'success') => {
    setLogs(prev => [...prev, { message, level, timestamp: new Date() }]);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Distribution Editor</h1>
      </header>

      <div className="editor-pane">
        <MonacoEditor
          value={code}
          onChange={handleCodeChange}
          errors={errors}
          onCompile={handleCompile}
        />
      </div>

      <ControlsBar
        playbackStatus={playbackStatus}
        position={position}
        onStart={handleStart}
        onStop={handleStop}
      />

      <LogPane logs={logs} />
    </div>
  );
};

export default App;
```

---

## 関連ドキュメント

### このリファレンス内

- [ARCHITECTURE.md](ARCHITECTURE.md) - フロントエンドの位置づけ
- [MONACO_INTEGRATION.md](MONACO_INTEGRATION.md) - エディタ統合
- [OIDUNA_API_INTEGRATION.md](OIDUNA_API_INTEGRATION.md) - API通信
- [VALIDATION_PATTERNS.md](VALIDATION_PATTERNS.md) - エラー表示

### 外部リソース

- [React Documentation](https://react.dev/)
- [Vue Documentation](https://vuejs.org/)
- [Monaco Editor API](https://microsoft.github.io/monaco-editor/api/index.html)
- [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

---

## ベストプラクティス

### パフォーマンス

1. **デバウンス**: エディタ変更は300ms程度デバウンス
2. **メモ化**: 不要な再レンダリングを避ける（React.memo, Vue computed）
3. **仮想スクロール**: ログペインは仮想スクロール使用
4. **Web Worker**: 重い処理はWorkerで実行

### ユーザビリティ

1. **キーボードショートカット**: Ctrl+S（保存）、Ctrl+Enter（コンパイル＆再生）
2. **エラー表示**: エラーは即座に、かつ分かりやすく
3. **フィードバック**: ローディング状態を明示
4. **レスポンシブ**: モバイルでも使えるUI

### メンテナンス性

1. **コンポーネント分離**: 責任を明確に分割
2. **型定義**: TypeScriptで厳密に型付け
3. **テスト**: コンポーネントのユニットテスト
4. **ドキュメント**: コンポーネントのpropsを文書化

---

**Last Updated**: 2026-02-24
**Scope**: DSL非依存のフロントエンドパターン
**Status**: ✅ 完成
