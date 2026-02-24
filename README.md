# MARS for Oiduna

**MARS Distribution for Oiduna Loop Engine**

MARSライブコーディングDSLのOiduna向けDistribution実装。

---

## 🎯 概要

MARS for OidunaはMARSのDSL（Domain-Specific Language）をOidunaのIR（Intermediate Representation）に変換するDistribution実装です。

### 役割

- **DSLコンパイラ**: MARS構文のパース・コンパイル
- **音楽理論処理**: スケール、コード、度数解決
- **IR生成**: Oiduna CompiledSessionの生成
- **HTTP通信**: Oiduna APIへのJSON送信

### 非責任（Oidunaが担当）

- ループ再生
- OSC/MIDI出力
- タイミング制御

---

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────┐
│ MARS DSL                                │
│  section intro {                        │
│    track kick {                         │
│      pattern [1 0 0 0]                  │
│      scale Cmaj                         │
│    }                                    │
│  }                                      │
└──────────────┬──────────────────────────┘
               │ Parse (Lark)
               ↓
┌─────────────────────────────────────────┐
│ MARS AST                                │
│  - Section nodes                        │
│  - Track nodes                          │
│  - Pattern nodes                        │
└──────────────┬──────────────────────────┘
               │ Compile
               ↓
┌─────────────────────────────────────────┐
│ Music Theory Processing                 │
│  - Scale resolution (Cmaj → C,D,E,...)  │
│  - Degree → MIDI note (1 → 60, 3 → 64)  │
│  - Chord expansion                      │
└──────────────┬──────────────────────────┘
               │ Generate IR
               ↓
┌─────────────────────────────────────────┐
│ Oiduna CompiledSession (JSON)           │
│  {                                      │
│    "environment": {...},                │
│    "tracks": {...},                     │
│    "sequences": {...}                   │
│  }                                      │
└──────────────┬──────────────────────────┘
               │ HTTP POST
               ↓
┌─────────────────────────────────────────┐
│ Oiduna Loop Engine                      │
│  - 256-step loop playback               │
│  - SuperDirt/MIDI output                │
└─────────────────────────────────────────┘
```

---

## 🚀 クイックスタート

### 前提条件

- Python 3.13+
- [uv](https://github.com/astral-sh/uv)
- Oidunaが起動済み（http://localhost:57122）

### インストール

```bash
cd MARS_for_oiduna
uv sync
```

### 基本的な使用方法

```bash
# MARSファイルをコンパイルしてOidunaに送信
uv run mars-compile example.mars --send

# コンパイル結果のみ確認（送信なし）
uv run mars-compile example.mars --output compiled.json
```

### サンプルMARSコード

```mars
# example.mars
bpm 120
root C

section intro {
    track kick {
        pattern [1 0 0 0]
        sample "bd"
        gain 0.8
    }

    track bass {
        pattern [1 3 5 3]
        scale Cmin
        octave 2
        gate 0.5
    }
}
```

---

## 📚 ドキュメント

### ユーザー向け

- **[DSL_REFERENCE.md](docs/DSL_REFERENCE.md)** - MARS DSL完全仕様（準備中）
- **[EXAMPLES.md](docs/EXAMPLES.md)** - サンプルコード集（準備中）
- **[MUSIC_THEORY.md](docs/MUSIC_THEORY.md)** - 音楽理論ガイド（準備中）

### 開発者向け

- **[COMPILER_GUIDE.md](docs/COMPILER_GUIDE.md)** - コンパイラ実装ガイド（準備中）
- **[MARS_TO_OIDUNA.md](docs/MARS_TO_OIDUNA.md)** - DSL→IR変換詳細（準備中）
- **[CONTRIBUTING.md](docs/CONTRIBUTING.md)** - コントリビューションガイド（準備中）

### ワークスペースレベルドキュメント

- [Architecture Evolution](../docs/ARCHITECTURE_EVOLUTION.md) - MARS→Oiduna分離の経緯
- [ADR-001: Separation of Concerns](../docs/ADR/001-separation-of-concerns.md) - 分離の設計判断

---

## 🎼 MARS DSL概要

### 基本構造

```mars
# グローバル設定
bpm 120
root C

# セクション定義
section <name> {
    # トラック定義
    track <name> {
        # パターン
        pattern [...]

        # 音楽理論
        scale <scale_name>
        chord <chord_name>
        octave <number>

        # パラメータ
        gain <value>
        pan <value>
        gate <value>
    }
}
```

### 音楽理論サポート

| 概念 | MARS表記 | Oiduna IR |
|------|---------|----------|
| スケール | `scale Cmaj` | MIDIノート番号配列 |
| コード | `chord Cmaj7` | MIDIノート番号配列 |
| 度数 | `pattern [1 3 5]` | MIDIノート番号（60, 64, 67） |
| オクターブ | `octave 2` | MIDIノート番号 + 12 |

### パターン表記

```mars
# リスト形式
pattern [1 0 3 0 5 0 3 0]

# 繰り返し
pattern [1 0]*4

# 休符
pattern [1 _ 3 _]

# ポリリズム
pattern [1 3 5] * [bd sn ht]
```

---

## 🔧 開発状況

### Phase 1（準備中）
- [ ] DSLパーサー（Lark）
- [ ] 基本コンパイラ
- [ ] 音楽理論ライブラリ（スケール・コード）
- [ ] Oiduna IR生成器

### Phase 2（計画中）
- [ ] 高度なパターン表記（Euclideanリズムなど）
- [ ] 条件分岐・ループ構文
- [ ] マクロ機能

### Phase 3（未定）
- [ ] ライブリロード
- [ ] デバッグ機能
- [ ] LSP（Language Server Protocol）

---

## 🤝 コントリビューション

MARS for Oidunaはオープンソースプロジェクトです。Issue報告、Pull Requestを歓迎します。

詳細は [CONTRIBUTING.md](docs/CONTRIBUTING.md)（準備中）を参照してください。

---

## 📝 ライセンス

MIT

---

## 🔗 関連リンク

- **Oiduna**: [README](../oiduna/README.md) | [API Reference](../oiduna/docs/API_REFERENCE.md)
- **Workspace**: [README](../README.md) | [Docs](../docs/)
- **ADRs**: [Architecture Decision Records](../docs/ADR/)

---

**Last Updated**: 2026-02-24
**Status**: 🚧 準備中
