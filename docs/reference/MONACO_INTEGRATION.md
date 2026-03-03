# Monaco Editor Integration

**対象読者**: Distribution開発者
**目的**: Monaco Editorを用いたDSLエディタ統合パターンを理解する

このドキュメントは**DSL非依存**です。MARS固有の構文には言及せず、汎用的なMonaco統合パターンを説明します。

---

## 目次

1. [概要](#概要)
2. [Monaco Editor概要](#monaco-editor概要)
3. [言語登録とセットアップ](#言語登録とセットアップ)
4. [シンタックスハイライト](#シンタックスハイライト)
5. [オートコンプリート](#オートコンプリート)
6. [エラーマーカー](#エラーマーカー)
7. [ホバー情報](#ホバー情報)
8. [実装例](#実装例)

---

## 概要

### Monaco Editorの役割

Distribution実装において、Monaco Editorは以下の責任を持ちます：

```
┌──────────────────────────────────────────┐
│            Monaco Editor                 │
│                                          │
│  1. コード入力                            │
│     - テキスト編集                        │
│     - キーバインド                        │
│     - マルチカーソル                      │
│                                          │
│  2. シンタックスハイライト                 │
│     - キーワード色分け                    │
│     - 数値、文字列の装飾                  │
│                                          │
│  3. オートコンプリート                    │
│     - 入力候補表示                        │
│     - ドキュメント表示                    │
│                                          │
│  4. エラー表示                            │
│     - 赤波線表示                          │
│     - エラーメッセージ                    │
│                                          │
│  5. ホバー情報                            │
│     - ツールチップ表示                    │
│     - ドキュメント参照                    │
│                                          │
└──────────────────────────────────────────┘
```

### なぜMonaco Editorを使うのか

✅ **利点**:
- **VS Code同等の機能** - マイクロソフトがVS Codeのために開発したエディタ
- **豊富なAPI** - 言語機能を全てカスタマイズ可能
- **パフォーマンス** - 大規模ファイルも高速
- **言語サーバープロトコル対応** - LSP実装も可能
- **アクセシビリティ** - スクリーンリーダー対応

❌ **代替案との比較**:
- **CodeMirror 6** - 軽量だがAPIが異なる
- **Ace Editor** - 古い、機能が少ない
- **textarea** - 機能なし、ライブコーディングに不向き

参考: [Monaco Editor公式ドキュメント](https://microsoft.github.io/monaco-editor/)

---

## Monaco Editor概要

### インストール

```bash
npm install monaco-editor
```

### 基本的なセットアップ

```typescript
import * as monaco from 'monaco-editor';

// エディタ初期化
const editor = monaco.editor.create(document.getElementById('editor')!, {
  value: '// Your DSL code here',
  language: 'mydsl',  // カスタム言語ID
  theme: 'vs-dark',
  automaticLayout: true,
  minimap: { enabled: false },
});
```

### 主要なAPI

| API | 用途 |
|-----|------|
| `monaco.languages.register()` | 新しい言語を登録 |
| `monaco.languages.setMonarchTokensProvider()` | シンタックスハイライト定義 |
| `monaco.languages.registerCompletionItemProvider()` | オートコンプリート |
| `monaco.editor.setModelMarkers()` | エラーマーカー表示 |
| `monaco.languages.registerHoverProvider()` | ホバー情報 |

---

## 言語登録とセットアップ

### 言語ID登録

まず、カスタムDSLの言語IDを登録します。

```typescript
// 言語登録
monaco.languages.register({
  id: 'mydsl',           // 任意の言語ID
  extensions: ['.mydsl'], // ファイル拡張子
  aliases: ['MyDSL', 'mydsl'],
  mimetypes: ['text/x-mydsl'],
});
```

### エディタ設定オプション

```typescript
const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  // 基本設定
  value: initialCode,
  language: 'mydsl',
  theme: 'vs-dark',

  // レイアウト
  automaticLayout: true,
  minimap: { enabled: false },
  lineNumbers: 'on',

  // 入力補助
  quickSuggestions: true,
  suggestOnTriggerCharacters: true,
  wordBasedSuggestions: false,

  // 折りたたみ
  folding: true,
  foldingStrategy: 'indentation',

  // スクロール
  scrollBeyondLastLine: false,
  smoothScrolling: true,
};

const editor = monaco.editor.create(container, editorOptions);
```

---

## シンタックスハイライト

### Monarch言語定義

MonacoはMonarchという宣言型言語定義システムを使います。

```typescript
monaco.languages.setMonarchTokensProvider('mydsl', {
  // トークンクラス定義
  tokenizer: {
    root: [
      // キーワード
      [/\b(keyword1|keyword2|keyword3)\b/, 'keyword'],

      // 数値
      [/\d+/, 'number'],

      // 文字列
      [/"([^"\\]|\\.)*$/, 'string.invalid'],  // 閉じていない文字列
      [/"/, 'string', '@string'],

      // コメント
      [/\/\/.*$/, 'comment'],

      // 識別子
      [/[a-zA-Z_]\w*/, 'identifier'],

      // 区切り文字
      [/[{}()\[\]]/, '@brackets'],
      [/[,;:]/, 'delimiter'],
    ],

    string: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop'],
    ],
  },
});
```

### トークンクラスとテーマ

Monarchのトークンクラスは、テーマで色を指定します。

| トークンクラス | 用途 | デフォルト色（vs-dark） |
|-------------|------|----------------------|
| `keyword` | キーワード | ピンク |
| `number` | 数値 | 緑 |
| `string` | 文字列 | オレンジ |
| `comment` | コメント | グレー |
| `identifier` | 変数名 | 水色 |
| `operator` | 演算子 | 白 |

### 詳細なMonarch構造

```typescript
interface IMonarchLanguage {
  // デフォルトトークン（マッチしない場合）
  defaultToken?: string;

  // トークナイザーステート
  tokenizer: {
    [stateName: string]: IMonarchLanguageRule[];
  };

  // キーワード定義
  keywords?: string[];

  // 演算子定義
  operators?: string[];

  // シンボル定義
  symbols?: RegExp;

  // エスケープ文字定義
  escapes?: RegExp;
}
```

### 実践的な例：キーワードハイライト

```typescript
monaco.languages.setMonarchTokensProvider('mydsl', {
  keywords: [
    'define', 'track', 'pattern', 'sequence',
    'if', 'else', 'for', 'while',
    'play', 'stop', 'loop',
  ],

  operators: ['+', '-', '*', '/', '=', '==', '!=', '<', '>'],

  symbols: /[=><!~?:&|+\-*\/\^%]+/,

  tokenizer: {
    root: [
      // キーワードチェック
      [/[a-zA-Z_]\w*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier',
        },
      }],

      // 数値（整数・小数）
      [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
      [/\d+/, 'number'],

      // 演算子
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': '',
        },
      }],

      // 文字列
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string_double'],
      [/'/, 'string', '@string_single'],

      // コメント
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],

      // 区切り
      [/[{}()\[\]]/, '@brackets'],
      [/[;,.]/, 'delimiter'],
    ],

    comment: [
      [/[^\/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment'],
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop'],
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/\\./, 'string.escape'],
      [/'/, 'string', '@pop'],
    ],
  },
});
```

---

## オートコンプリート

### CompletionItemProvider登録

```typescript
monaco.languages.registerCompletionItemProvider('mydsl', {
  provideCompletionItems: (model, position) => {
    // 現在のカーソル位置の単語を取得
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    };

    // 補完候補を生成
    const suggestions: monaco.languages.CompletionItem[] = [
      {
        label: 'keyword1',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: 'keyword1',
        range: range,
        documentation: 'Description of keyword1',
      },
      {
        label: 'function1',
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: 'function1(${1:arg})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: range,
        documentation: 'Description of function1',
      },
    ];

    return { suggestions };
  },
});
```

### CompletionItemKind

| Kind | 用途 | アイコン |
|------|------|---------|
| `Keyword` | キーワード | 🔑 |
| `Function` | 関数 | ƒ |
| `Variable` | 変数 | x |
| `Class` | クラス | C |
| `Property` | プロパティ | p |
| `Value` | 値 | v |
| `Snippet` | スニペット | {} |

### スニペット挿入

```typescript
{
  label: 'track',
  kind: monaco.languages.CompletionItemKind.Snippet,
  insertText: [
    'track ${1:name} {',
    '\t${2:// pattern here}',
    '}',
  ].join('\n'),
  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
  documentation: 'Creates a new track',
  range: range,
}
```

### 動的な補完候補生成

```typescript
provideCompletionItems: (model, position) => {
  const textUntilPosition = model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });

  // コンテキストに応じた候補生成
  const suggestions: monaco.languages.CompletionItem[] = [];

  // 例: "track " の後では、トラック名候補を提供
  if (textUntilPosition.endsWith('track ')) {
    suggestions.push({
      label: 'kick',
      kind: monaco.languages.CompletionItemKind.Value,
      insertText: 'kick',
      range: range,
    });
  }

  // 例: 関数内では、パラメータ候補を提供
  if (isInsideFunction(textUntilPosition)) {
    suggestions.push({
      label: 'param1',
      kind: monaco.languages.CompletionItemKind.Property,
      insertText: 'param1: ${1:value}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: range,
    });
  }

  return { suggestions };
}
```

---

## エラーマーカー

### マーカーAPI

```typescript
// エラーマーカーを設定
monaco.editor.setModelMarkers(model, 'mydsl', [
  {
    severity: monaco.MarkerSeverity.Error,
    startLineNumber: 5,
    startColumn: 1,
    endLineNumber: 5,
    endColumn: 10,
    message: 'Undefined variable: foo',
  },
  {
    severity: monaco.MarkerSeverity.Warning,
    startLineNumber: 10,
    startColumn: 5,
    endLineNumber: 10,
    endColumn: 15,
    message: 'This pattern is deprecated',
  },
]);
```

### MarkerSeverity

| Severity | 用途 | 表示 |
|----------|------|------|
| `Error` | 構文エラー、致命的エラー | 赤波線 |
| `Warning` | 警告、非推奨 | 黄波線 |
| `Info` | 情報 | 青波線 |
| `Hint` | ヒント | 点線 |

### リアルタイムバリデーション

```typescript
let validationTimeout: number | undefined;

editor.onDidChangeModelContent(() => {
  // デバウンス（300ms待機）
  if (validationTimeout) {
    clearTimeout(validationTimeout);
  }

  validationTimeout = window.setTimeout(() => {
    const code = editor.getValue();
    const errors = validateCode(code);  // バリデーション関数

    // マーカー設定
    monaco.editor.setModelMarkers(
      editor.getModel()!,
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
  }, 300);
});
```

### バリデーション統合例

```typescript
interface ValidationError {
  line: number;
  column: number;
  length: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

async function validateCode(code: string): Promise<ValidationError[]> {
  // バックエンドAPIにPOST
  const response = await fetch('/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  const result = await response.json();
  return result.errors || [];
}

function updateMarkers(errors: ValidationError[]) {
  const severityMap = {
    error: monaco.MarkerSeverity.Error,
    warning: monaco.MarkerSeverity.Warning,
    info: monaco.MarkerSeverity.Info,
  };

  monaco.editor.setModelMarkers(
    editor.getModel()!,
    'mydsl',
    errors.map(err => ({
      severity: severityMap[err.severity],
      startLineNumber: err.line,
      startColumn: err.column,
      endLineNumber: err.line,
      endColumn: err.column + err.length,
      message: err.message,
    }))
  );
}
```

---

## ホバー情報

### HoverProvider登録

```typescript
monaco.languages.registerHoverProvider('mydsl', {
  provideHover: (model, position) => {
    // カーソル位置の単語を取得
    const word = model.getWordAtPosition(position);
    if (!word) return null;

    // ホバー情報を生成
    const documentation = getDocumentation(word.word);
    if (!documentation) return null;

    return {
      range: new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn
      ),
      contents: [
        { value: `**${word.word}**` },
        { value: documentation },
      ],
    };
  },
});
```

### Markdownサポート

```typescript
return {
  contents: [
    { value: '**Function**: `play`' },
    { value: 'Plays a sound or pattern.' },
    { value: '```typescript\nplay(sound: string, params: object)\n```' },
    { value: '**Example:**\n```mydsl\nplay("kick", { gain: 0.8 })\n```' },
  ],
};
```

### 動的ドキュメント取得

```typescript
async provideHover(model, position) {
  const word = model.getWordAtPosition(position);
  if (!word) return null;

  // バックエンドから情報取得
  const response = await fetch(`/api/docs/${word.word}`);
  const docs = await response.json();

  if (!docs) return null;

  return {
    range: new monaco.Range(
      position.lineNumber,
      word.startColumn,
      position.lineNumber,
      word.endColumn
    ),
    contents: [
      { value: `**${docs.name}** (${docs.type})` },
      { value: docs.description },
      { value: `\`\`\`mydsl\n${docs.example}\n\`\`\`` },
    ],
  };
}
```

---

## 実装例

### フル統合例

```typescript
import * as monaco from 'monaco-editor';

// 1. 言語登録
monaco.languages.register({ id: 'mydsl' });

// 2. シンタックスハイライト
monaco.languages.setMonarchTokensProvider('mydsl', {
  keywords: ['define', 'track', 'pattern', 'play', 'stop'],
  operators: ['+', '-', '*', '/', '='],

  tokenizer: {
    root: [
      [/[a-zA-Z_]\w*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier',
        },
      }],
      [/\d+/, 'number'],
      [/"([^"\\]|\\.)*"/, 'string'],
      [/\/\/.*$/, 'comment'],
      [/@symbols/, 'operator'],
    ],
  },
});

// 3. オートコンプリート
monaco.languages.registerCompletionItemProvider('mydsl', {
  provideCompletionItems: (model, position) => {
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    };

    return {
      suggestions: [
        {
          label: 'track',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'track ${1:name} {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Define a new track',
          range,
        },
      ],
    };
  },
});

// 4. ホバー情報
monaco.languages.registerHoverProvider('mydsl', {
  provideHover: (model, position) => {
    const word = model.getWordAtPosition(position);
    if (!word) return null;

    const docs: Record<string, string> = {
      track: 'Defines a new audio track',
      pattern: 'Defines a rhythmic pattern',
      play: 'Triggers sound playback',
    };

    if (!(word.word in docs)) return null;

    return {
      range: new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn
      ),
      contents: [
        { value: `**${word.word}**` },
        { value: docs[word.word] },
      ],
    };
  },
});

// 5. エディタ作成
const editor = monaco.editor.create(document.getElementById('editor')!, {
  value: '// Write your DSL code here\n',
  language: 'mydsl',
  theme: 'vs-dark',
  automaticLayout: true,
});

// 6. リアルタイムバリデーション
let timeout: number | undefined;
editor.onDidChangeModelContent(() => {
  if (timeout) clearTimeout(timeout);

  timeout = window.setTimeout(async () => {
    const code = editor.getValue();

    // バリデーションAPI呼び出し
    const response = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    const { errors } = await response.json();

    // エラーマーカー設定
    monaco.editor.setModelMarkers(
      editor.getModel()!,
      'mydsl',
      errors.map((err: any) => ({
        severity: monaco.MarkerSeverity.Error,
        startLineNumber: err.line,
        startColumn: err.column,
        endLineNumber: err.line,
        endColumn: err.column + err.length,
        message: err.message,
      }))
    );
  }, 300);
});
```

### React統合例

```tsx
import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  onValidate: (errors: monaco.editor.IMarker[]) => void;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  onValidate,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // エディタ初期化
    monacoRef.current = monaco.editor.create(editorRef.current, {
      value,
      language: 'mydsl',
      theme: 'vs-dark',
      automaticLayout: true,
    });

    // 変更リスナー
    monacoRef.current.onDidChangeModelContent(() => {
      const newValue = monacoRef.current!.getValue();
      onChange(newValue);
    });

    // クリーンアップ
    return () => {
      monacoRef.current?.dispose();
    };
  }, []);

  return <div ref={editorRef} style={{ height: '100%', width: '100%' }} />;
};
```

### Vue統合例

```vue
<template>
  <div ref="editorContainer" class="editor-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as monaco from 'monaco-editor';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'validate': [errors: monaco.editor.IMarker[]];
}>();

const editorContainer = ref<HTMLDivElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

onMounted(() => {
  if (!editorContainer.value) return;

  editor = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: 'mydsl',
    theme: 'vs-dark',
    automaticLayout: true,
  });

  editor.onDidChangeModelContent(() => {
    emit('update:modelValue', editor!.getValue());
  });
});

onUnmounted(() => {
  editor?.dispose();
});

watch(() => props.modelValue, (newValue) => {
  if (editor && editor.getValue() !== newValue) {
    editor.setValue(newValue);
  }
});
</script>

<style scoped>
.editor-container {
  height: 100%;
  width: 100%;
}
</style>
```

---

## 関連ドキュメント

### このリファレンス内

- [ARCHITECTURE.md](ARCHITECTURE.md) - Monaco Editorの位置づけ
- [VALIDATION_PATTERNS.md](VALIDATION_PATTERNS.md) - エラーマーカー連携
- [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) - UI統合パターン

### 外部リソース

- [Monaco Editor公式ドキュメント](https://microsoft.github.io/monaco-editor/)
- [Monaco Editor API](https://microsoft.github.io/monaco-editor/api/index.html)
- [Monarch言語定義ガイド](https://microsoft.github.io/monaco-editor/monarch.html)

---

## ベストプラクティス

### パフォーマンス最適化

1. **デバウンス**: バリデーションは300ms程度デバウンスする
2. **差分更新**: `setValue`ではなく`applyEdits`を使う
3. **マーカークリア**: 古いマーカーは明示的にクリア
4. **Worker使用**: 重い処理はWeb Workerで実行

### ユーザビリティ

1. **キーバインド**: VS Code準拠のショートカットを維持
2. **エラー位置**: エラーマーカーは正確な位置を指定
3. **ドキュメント**: ホバー情報は簡潔で有用に
4. **補完候補**: コンテキストに応じた候補のみ表示

### メンテナンス性

1. **定義分離**: Monarch定義は別ファイルに分離
2. **型定義**: TypeScriptで厳密に型付け
3. **テスト**: トークナイザーのユニットテスト
4. **ドキュメント**: 言語機能の仕様を文書化

---

**Last Updated**: 2026-02-24
**Scope**: DSL非依存のMonaco統合パターン
**Status**: ✅ 完成
