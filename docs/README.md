# MARS for Oiduna Documentation

**MARS Distribution ドキュメントへようこそ**

---

## 📚 ドキュメント一覧

### ユーザー向けドキュメント

#### 🎓 学習ガイド

- **DSL_REFERENCE.md**（準備中） - MARS DSL完全仕様
  - 構文リファレンス
  - パターン表記法
  - 音楽理論機能
  - ビルトイン関数

- **EXAMPLES.md**（準備中） - サンプルコード集
  - 初心者向けサンプル
  - 実践的パターン
  - ジャンル別サンプル

- **MUSIC_THEORY.md**（準備中） - 音楽理論ガイド
  - スケール一覧
  - コード一覧
  - 度数システム
  - モードの使い方

#### 🛠️ 実践ガイド

- **USAGE_GUIDE.md**（準備中） - 使い方ガイド
  - インストール
  - 基本的な使い方
  - ワークフロー
  - トラブルシューティング

### 開発者向けドキュメント

#### 🏗️ アーキテクチャ

- **COMPILER_GUIDE.md**（準備中） - コンパイラ実装ガイド
  - パーサー構造（Lark）
  - ASTノード定義
  - 型システム
  - エラーハンドリング

- **MARS_TO_OIDUNA.md**（準備中） - DSL→IR変換詳細
  - 変換フロー
  - 音楽理論処理
  - 度数解決アルゴリズム
  - 最適化戦略

#### 🤝 コントリビューション

- **CONTRIBUTING.md**（準備中） - コントリビューションガイド
  - 開発環境セットアップ
  - コーディング規約
  - テスト方針
  - Pull Requestプロセス

---

## 🎯 ドキュメント配置方針

### ✅ このディレクトリに配置すべき内容

- **MARS固有のDSL仕様** - MARS構文、パターン表記
- **MARS固有の実装詳細** - コンパイラ、パーサー、音楽理論処理
- **MARSの使い方** - ユーザーガイド、サンプル
- **MARS開発者向け情報** - コントリビューションガイド、実装詳細

### ❌ このディレクトリに配置すべきでない内容

- **Oiduna固有の情報** → [oiduna/docs/](../../oiduna/docs/)
  - Oiduna APIリファレンス
  - Oiduna IRモデル仕様
  - Oidunaアーキテクチャ
  - Oidunaパフォーマンス

- **ワークスペースレベルの情報** → [docs/](../../docs/)
  - プロジェクト間の設計判断（ADR）
  - 歴史的経緯（ARCHITECTURE_EVOLUTION）
  - 横断的な提案書

---

## 🔄 他プロジェクトとの連携

### Oidunaドキュメント参照

MARSがOidunaと通信する際の情報：

- **Oiduna IRモデル仕様**: [oiduna/docs/DATA_MODEL_REFERENCE.md](../../oiduna/docs/DATA_MODEL_REFERENCE.md)
- **Oiduna API仕様**: [oiduna/docs/API_REFERENCE.md](../../oiduna/docs/API_REFERENCE.md)
- **Distribution実装ガイド**: [oiduna/docs/DISTRIBUTION_GUIDE.md](../../oiduna/docs/DISTRIBUTION_GUIDE.md)

### ワークスペースドキュメント参照

プロジェクト横断的な設計判断：

- **MARS→Oiduna分離の経緯**: [docs/ARCHITECTURE_EVOLUTION.md](../../docs/ARCHITECTURE_EVOLUTION.md)
- **ADR-001: 責任分離**: [docs/ADR/001-separation-of-concerns.md](../../docs/ADR/001-separation-of-concerns.md)
- **ADR-002: HTTP API選択**: [docs/ADR/002-http-api-choice.md](../../docs/ADR/002-http-api-choice.md)

---

## 📝 ドキュメント相互参照の例

### MARS側からOiduna情報を参照

```markdown
<!-- MARS_TO_OIDUNA.md内 -->
OidunaのCompiledSession仕様は [Data Model Reference](../../oiduna/docs/DATA_MODEL_REFERENCE.md) を参照してください。

度数をMIDIノート番号に変換した後、Oiduna IRの `Event.note` フィールドに格納します。
```

### Oiduna側からMARS情報を参照

```markdown
<!-- oiduna/docs/DISTRIBUTION_GUIDE.md内 -->
MARS DistributionはDSLコンパイラを実装しています。実装例は [MARS Compiler Guide](../../MARS_for_oiduna/docs/COMPILER_GUIDE.md) を参照してください。
```

---

## 🚧 開発ステータス

| ドキュメント | ステータス | 優先度 |
|------------|----------|--------|
| DSL_REFERENCE.md | 準備中 | 高 |
| COMPILER_GUIDE.md | 準備中 | 高 |
| MARS_TO_OIDUNA.md | 準備中 | 高 |
| EXAMPLES.md | 準備中 | 中 |
| MUSIC_THEORY.md | 準備中 | 中 |
| USAGE_GUIDE.md | 準備中 | 中 |
| CONTRIBUTING.md | 準備中 | 低 |

---

## 🤝 ドキュメント作成への貢献

新しいドキュメントを追加する際は：

1. **Single Source of Truth** を守る
   - 情報の重複を避ける
   - Oiduna固有の情報はOidunaドキュメントへ
   - ワークスペースレベルの情報はdocs/へ

2. **相互参照を活用**
   - 他プロジェクトの情報は相対パスでリンク
   - コピー&ペーストを避ける

3. **バージョン情報を明記**
   - 各ドキュメントに`Last Updated`を追加
   - 互換性情報を明記

---

**Last Updated**: 2026-02-24
**Status**: 🚧 準備中
