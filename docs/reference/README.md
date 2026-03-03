# Distribution作成リファレンス

**対象読者**: Oiduna用Distributionを作成する開発者

このディレクトリはOiduna用Distributionを作成する際の**参考実装ガイド**です。MARS_for_oidunaの技術統合パターンを、DSL構文に依存しない形で解説します。

---

## 📖 読む順序

Distribution実装を理解するための推奨読み順：

1. **[ARCHITECTURE.md](ARCHITECTURE.md)** - 全体像を理解
   - 5大コンポーネントの役割
   - データフローの全体像
   - 技術スタック

2. **[PARSER_INTEGRATION.md](PARSER_INTEGRATION.md)** - DSLパーサー統合
   - Larkパーサーのセットアップ
   - .larkファイル構造
   - パースエラーハンドリング

3. **[VALIDATION_PATTERNS.md](VALIDATION_PATTERNS.md)** - バリデーション
   - 3段階バリデーション戦略
   - ASTウォーカー実装
   - エラーメッセージ設計

4. **[IR_GENERATION_PATTERNS.md](IR_GENERATION_PATTERNS.md)** - Oiduna IR生成
   - AST → CompiledSessionの変換パターン
   - 256ステップ展開戦略
   - Pydanticモデル活用

5. **[OIDUNA_API_INTEGRATION.md](OIDUNA_API_INTEGRATION.md)** - Oiduna API連携
   - 使用エンドポイント
   - HTTP通信実装
   - SSEストリーミング

6. **[MONACO_INTEGRATION.md](MONACO_INTEGRATION.md)** - Monaco統合
   - シンタックスハイライト（Monarch言語定義）
   - オートコンプリート（CompletionItemProvider）
   - エラー表示（Monaco markers API）
   - ホバー情報

7. **[FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md)** - フロントエンド
   - UI構成（エディタ、コントロール、ログペイン）
   - 状態管理（React/Vue/vanilla）
   - リアルタイムフィードバック（SSE統合）
   - コンパイル→再生ワークフロー

---

## 🎯 このリファレンスの目的

### ✅ 提供する情報

- **技術統合パターン** - Lark、Monaco、Oiduna APIの統合方法
- **アーキテクチャ設計** - コンポーネント分割、責任分離
- **データフロー** - DSL → AST → IR → Oidunaの流れ
- **実装戦略** - バリデーション、エラーハンドリング、最適化

### ❌ 提供しない情報

- **MARS固有のDSL構文** → [../mars/DSL_SPECIFICATION.md](../mars/DSL_SPECIFICATION.md)
- **MARS固有の文法定義** → MARS_for_oiduna/mars_dsl/grammar/
- **MARS固有のUI仕様** → [../mars/UI_SPECIFICATION.md](../mars/UI_SPECIFICATION.md)
- **Oiduna自体の仕様** → [oiduna/docs/](../../../oiduna/docs/)

---

## 🏗️ Distribution実装の全体像

```
┌─────────────────────────────────────────┐
│ 1. DSLパーサー (Lark)                    │
│    - .lark文法定義                       │
│    - ASTノード生成                       │
│    - パースエラーハンドリング             │
└──────────────┬──────────────────────────┘
               │ AST
               ↓
┌─────────────────────────────────────────┐
│ 2. バリデーション                        │
│    - ASTウォーカー                       │
│    - セマンティック検証                  │
│    - エラーメッセージ生成                │
└──────────────┬──────────────────────────┘
               │ Validated AST
               ↓
┌─────────────────────────────────────────┐
│ 3. IR生成器                              │
│    - AST → Oiduna CompiledSession       │
│    - 256ステップ展開                     │
│    - Pydanticモデル構築                  │
└──────────────┬──────────────────────────┘
               │ CompiledSession (JSON)
               ↓
┌─────────────────────────────────────────┐
│ 4. Oiduna API連携                        │
│    - POST /playback/session             │
│    - POST /playback/start               │
│    - SSEストリーミング                   │
└──────────────┬──────────────────────────┘
               │ OSC/MIDI
               ↓
┌─────────────────────────────────────────┐
│ 5. フロントエンド (Monaco)               │
│    - エディタペイン                      │
│    - シンタックスハイライト              │
│    - オートコンプリート                  │
│    - リアルタイムエラー表示              │
└─────────────────────────────────────────┘
```

---

## 📚 関連ドキュメント

### Oidunaドキュメント（必読）

- **[API Reference](../../../oiduna/docs/API_REFERENCE.md)** - 使用するHTTPエンドポイント
- **[Data Model Reference](../../../oiduna/docs/DATA_MODEL_REFERENCE.md)** - CompiledSession IRの完全仕様
- **[Distribution Guide](../../../oiduna/docs/DISTRIBUTION_GUIDE.md)** - Distribution作成ガイド
- **[Architecture](../../../oiduna/docs/ARCHITECTURE.md)** - Oidunaの内部構造

### MARS固有ドキュメント（参考実装）

- **[mars/](../mars/)** - MARS固有の仕様とロードマップ

### ワークスペースドキュメント（設計判断の背景）

- **[ADR-001: Separation of Concerns](../../../docs/ADR/001-separation-of-concerns.md)** - Oiduna/Distribution分離の理由
- **[Architecture Evolution](../../../docs/ARCHITECTURE_EVOLUTION.md)** - MARS→Oiduna分離の経緯

---

## 🔑 重要な注意事項

### ⚠️ MARS DSL大規模変更について

MARS DSLは現在**大規模変更が予定されています**。

- **このリファレンスはDSL非依存** - MARS DSL変更の影響を受けません
- **具体的な文法例は最小限** - 汎用的なパターンのみ記載
- **MARS固有の情報は別ディレクトリ** - [../mars/](../mars/)を参照

### ✅ 他Distribution向けの汎用性

このリファレンスは以下のような別Distribution作成にも適用可能：

- **TidalCycles風Distribution** - ミニノーテーション、関数合成
- **Sonic Pi風Distribution** - Ruby風シンタックス、live_loop
- **カスタムDistribution** - 独自DSL、独自文法

技術スタックの選択（Lark、Monaco、React/Vue等）は自由です。このリファレンスは**パターンと設計思想**を提供します。

---

## 🚀 クイックスタート

1. **[ARCHITECTURE.md](ARCHITECTURE.md)** で全体像を把握
2. **[PARSER_INTEGRATION.md](PARSER_INTEGRATION.md)** でLark統合方法を理解
3. **[IR_GENERATION_PATTERNS.md](IR_GENERATION_PATTERNS.md)** でIR生成パターンを学習
4. **[OIDUNA_API_INTEGRATION.md](OIDUNA_API_INTEGRATION.md)** でAPI連携を実装
5. サンプルコードは [oiduna/docs/DISTRIBUTION_GUIDE.md](../../../oiduna/docs/DISTRIBUTION_GUIDE.md) を参照

---

## 📝 フィードバック

このリファレンスに関する質問、改善提案は以下へ：

- **Issue報告**: プロジェクトリポジトリのIssue
- **Pull Request**: 誤字脱字、改善提案歓迎

---

**Last Updated**: 2026-02-24
**Target Audience**: Distribution開発者
**Scope**: DSL非依存の技術統合パターン
