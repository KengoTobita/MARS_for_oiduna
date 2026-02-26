# MARS for Oiduna Documentation

**MARS Distribution ドキュメントへようこそ**

---

## ⚠️ 重要: 2層ドキュメント構造

このドキュメントは**2つの異なる読者層**に向けて構造化されています：

### 📚 [reference/](reference/) - Distribution作成リファレンス

**対象読者**: 他のDistribution作者（TidalCycles風、Sonic Pi風など）

Oiduna用Distributionをゼロから作成する際の**参考実装ガイド**です。MARS DSL固有の情報は含まず、どのDistributionでも応用可能な技術統合パターンを提供します。

- コンポーネントアーキテクチャ
- パーサー統合方法（Lark）
- Monaco Editor統合
- バリデーション実装
- Oiduna IR生成パターン
- Oiduna API連携
- フロントエンド設計

### 🎵 [mars/](mars/) - MARS固有仕様

**対象読者**: MARS_for_oiduna開発者、MARSユーザー

MARSプロジェクト固有の仕様書です。MARS DSL文法、UI設計、実装機能、開発ロードマップが含まれます。

⚠️ **現在大規模変更中**: MARS DSLは現在大規模変更が予定されています。mars/以下のドキュメントは段階的に更新されます。

---

## 📚 ドキュメント構造

```
docs/
├── README.md                           # このファイル（ナビゲーション）
│
├── reference/                          # 汎用：Distribution作成の参考資料
│   ├── README.md                       # Reference導入
│   ├── ARCHITECTURE.md                 # コンポーネント構成
│   ├── PARSER_INTEGRATION.md           # Lark統合方法
│   ├── MONACO_INTEGRATION.md           # Monaco統合方法
│   ├── VALIDATION_PATTERNS.md          # バリデーション実装
│   ├── IR_GENERATION_PATTERNS.md       # Oiduna IR生成
│   ├── OIDUNA_API_INTEGRATION.md       # Oiduna API連携
│   └── FRONTEND_ARCHITECTURE.md        # フロントエンド設計
│
└── mars/                               # MARS固有：このプロジェクトの仕様
    ├── README.md                       # MARS仕様導入
    ├── DSL_SPECIFICATION.md            # MARS DSL文法（準備中）
    ├── GRAMMAR_DESIGN.md               # 文法設計判断（準備中）
    ├── UI_SPECIFICATION.md             # UIページ仕様（準備中）
    ├── FEATURES.md                     # 実装機能一覧（準備中）
    ├── EXAMPLES.md                     # MARSコード例（準備中）
    └── ROADMAP.md                      # 開発ロードマップ（準備中）
```

---

## 🎯 どのドキュメントを読むべきか

### 他のDistributionを作りたい場合

→ **[reference/](reference/)** を参照してください

MARS DSL構文には依存しない、汎用的な技術統合パターンが記載されています。

### MARS_for_oidunaを開発・使用する場合

→ **[mars/](mars/)** を参照してください

MARS固有のDSL文法、UI仕様、実装機能が記載されています（一部準備中）。

技術実装の詳細が必要な場合は **[reference/](reference/)** も併せて参照してください。

---

## 🔄 他プロジェクトとの連携

### Oidunaドキュメント参照

MARSがOidunaと通信する際の情報：

- **Oiduna IRモデル仕様**: [oiduna/docs/DATA_MODEL_REFERENCE.md](../../oiduna/docs/DATA_MODEL_REFERENCE.md)
- **Oiduna API仕様**: [oiduna/docs/API_REFERENCE.md](../../oiduna/docs/API_REFERENCE.md)
- **Distribution実装ガイド**: [oiduna/docs/DISTRIBUTION_GUIDE.md](../../oiduna/docs/DISTRIBUTION_GUIDE.md)
- **Oidunaアーキテクチャ**: [oiduna/docs/ARCHITECTURE.md](../../oiduna/docs/ARCHITECTURE.md)

### ワークスペースドキュメント参照

プロジェクト横断的な設計判断：

- **MARS→Oiduna分離の経緯**: [docs/ARCHITECTURE_EVOLUTION.md](../../docs/ARCHITECTURE_EVOLUTION.md)
- **ADR-001: 責任分離**: [docs/ADR/001-separation-of-concerns.md](../../docs/ADR/001-separation-of-concerns.md)
- **ADR-002: HTTP API選択**: [docs/ADR/002-http-api-choice.md](../../docs/ADR/002-http-api-choice.md)

---

## 🎯 ドキュメント配置方針

### ✅ このディレクトリに配置すべき内容

#### reference/ に配置すべき内容
- **DSL非依存の技術統合パターン** - パーサー統合、バリデーション、IR生成
- **他Distribution作者が参照すべき実装パターン**
- **アーキテクチャ設計の一般原則**

#### mars/ に配置すべき内容
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

## 📝 ドキュメント相互参照の例

### MARS側からOiduna情報を参照

```markdown
<!-- reference/IR_GENERATION_PATTERNS.md内 -->
OidunaのCompiledSession仕様は [Data Model Reference](../../oiduna/docs/DATA_MODEL_REFERENCE.md) を参照してください。
```

### Oiduna側からMARS情報を参照

```markdown
<!-- oiduna/docs/DISTRIBUTION_GUIDE.md内 -->
MARS DistributionはDSLコンパイラを実装しています。実装例は [MARS Reference](../../MARS_for_oiduna/docs/reference/) を参照してください。
```

---

## 🚧 開発ステータス

| ドキュメント | ステータス | 優先度 |
|------------|----------|--------|
| **reference/** |
| reference/README.md | ✅ 完成 | 最高 |
| reference/ARCHITECTURE.md | ✅ 完成 | 最高 |
| reference/OIDUNA_API_INTEGRATION.md | ✅ 完成 | 最高 |
| reference/PARSER_INTEGRATION.md | ✅ 完成 | 高 |
| reference/IR_GENERATION_PATTERNS.md | ✅ 完成 | 高 |
| reference/MONACO_INTEGRATION.md | ✅ 完成 | 中 |
| reference/VALIDATION_PATTERNS.md | ✅ 完成 | 中 |
| reference/FRONTEND_ARCHITECTURE.md | ✅ 完成 | 中 |
| **mars/** |
| mars/README.md | ✅ 完成 | 高 |
| mars/DSL_SPECIFICATION.md | 準備中 | 高 |
| mars/GRAMMAR_DESIGN.md | 準備中 | 高 |
| mars/UI_SPECIFICATION.md | 準備中 | 中 |
| mars/FEATURES.md | 準備中 | 中 |
| mars/EXAMPLES.md | 準備中 | 中 |
| mars/ROADMAP.md | 準備中 | 低 |

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

3. **適切なディレクトリに配置**
   - DSL非依存 → reference/
   - MARS固有 → mars/

4. **バージョン情報を明記**
   - 各ドキュメントに`Last Updated`を追加
   - 互換性情報を明記

---

**Last Updated**: 2026-02-24
**Status**: 🚧 構造整備完了、コンテンツ作成中
