# DSL Parser Integration

**対象読者**: Distribution開発者
**目的**: Larkを用いたDSLパーサー統合パターンを理解する

このドキュメントは**DSL非依存**です。MARS固有の構文には言及せず、汎用的なパーサー統合パターンを説明します。

---

## 目次

1. [概要](#概要)
2. [Larkパーサー概要](#larkパーサー概要)
3. [文法ファイル構造](#文法ファイル構造)
4. [パーサーセットアップ](#パーサーセットアップ)
5. [パース処理フロー](#パース処理フロー)
6. [エラーハンドリング](#エラーハンドリング)
7. [ASTノード設計](#astノード設計)
8. [Transformerパターン](#transformerパターン)

---

## 概要

### パーサーの役割

Distribution実装において、DSLパーサーは以下の責任を持ちます：

```
┌──────────────────────────────────────────┐
│         DSLコードテキスト                 │
│  (例: .mars, .tidal, .sonicpi ファイル)   │
└──────────────┬───────────────────────────┘
               │
               │ 1. 字句解析 (Lexing)
               ↓
┌──────────────────────────────────────────┐
│          トークンストリーム                │
│  [KEYWORD, NUMBER, IDENTIFIER, ...]      │
└──────────────┬───────────────────────────┘
               │
               │ 2. 構文解析 (Parsing)
               ↓
┌──────────────────────────────────────────┐
│         抽象構文木 (AST)                  │
│  Tree(Node, [Child, Child, ...])         │
└──────────────┬───────────────────────────┘
               │
               │ 3. AST変換 (Transform)
               ↓
┌──────────────────────────────────────────┐
│      Pythonデータ構造（ドメインモデル）    │
│  Session, Track, Pattern, ...            │
└──────────────────────────────────────────┘
```

### なぜLarkを使うのか

Larkは以下の特徴を持つPython製パーサーライブラリです：

✅ **利点**:
- **EBNF文法記述** - 読みやすく保守しやすい.lark文法ファイル
- **高速** - C拡張版（lark-cython）で更に高速化可能
- **エラーリカバリ** - 構文エラー時の部分的AST生成
- **Pythonネイティブ** - 依存関係がシンプル
- **多様な解析戦略** - Earley（デフォルト）、LALR、CYKから選択可能

❌ **代替案との比較**:
- **PLY (Python Lex-Yacc)** - より低レベル、コード量が多い
- **PyParsing** - 遅い、大規模DSLに不向き
- **ANTLR** - 高機能だがJava依存、セットアップが重い

参考: [Lark公式ドキュメント](https://lark-parser.readthedocs.io/)

---

## Larkパーサー概要

### インストール

```bash
pip install lark
```

### 基本的な使用例

```python
from lark import Lark

# 1. 文法定義
grammar = """
start: expression+

expression: number "+" number  -> add
          | number "-" number  -> subtract

number: /\d+/

%import common.WS
%ignore WS
"""

# 2. パーサー初期化
parser = Lark(grammar, start='start')

# 3. パース実行
code = "10 + 5"
tree = parser.parse(code)

print(tree.pretty())
# start
#   add
#     number	10
#     number	5
```

### 解析戦略

| 戦略 | 特徴 | 使用ケース |
|-----|------|----------|
| Earley (デフォルト) | 全てのCFG文法をサポート | 複雑な文法、曖昧な文法 |
| LALR | 高速、メモリ効率的 | シンプルな文法、パフォーマンス重視 |
| CYK | 曖昧性解決 | 曖昧な文法の全解釈が必要 |

```python
# LALR戦略を使用（高速化）
parser = Lark(grammar, parser='lalr')
```

---

## 文法ファイル構造

### EBNF基礎

Larkの文法は拡張BNF（EBNF）で記述します。

#### 基本要素

```ebnf
// ルール定義
rule_name: pattern

// 終端記号（トークン）
TERMINAL: /regex/

// 非終端記号（ルール参照）
rule: other_rule

// 選択 (OR)
rule: option_a | option_b

// シーケンス (AND)
rule: item_a item_b item_c

// オプション（0または1回）
rule: item?

// 繰り返し（0回以上）
rule: item*

// 繰り返し（1回以上）
rule: item+

// グループ化
rule: (item_a | item_b) item_c
```

#### 例: 簡単な式文法

```ebnf
// entry.lark

start: statement+

statement: assignment
         | expression

assignment: IDENTIFIER "=" expression

expression: NUMBER                    -> number
          | IDENTIFIER                -> variable
          | expression "+" expression -> add
          | expression "*" expression -> multiply
          | "(" expression ")"

IDENTIFIER: /[a-zA-Z_][a-zA-Z0-9_]*/
NUMBER: /\d+(\.\d+)?/

%import common.WS
%ignore WS
```

### トークン定義

#### 正規表現パターン

```ebnf
// 識別子
IDENTIFIER: /[a-zA-Z_][a-zA-Z0-9_]*/

// 整数
INTEGER: /\d+/

// 浮動小数点数
FLOAT: /\d+\.\d+/

// 文字列（ダブルクォート）
STRING: /"[^"]*"/

// 文字列（シングルクォート）
STRING_SINGLE: /'[^']*'/

// コメント（1行）
COMMENT: /\/\/.*/

// コメント（複数行）
MULTILINE_COMMENT: /\/\*[\s\S]*?\*\//
```

#### トークン優先度

より具体的なトークンを先に定義します：

```ebnf
// ✅ 正しい順序
KEYWORD_IF: "if"
KEYWORD_ELSE: "else"
IDENTIFIER: /[a-z]+/

// ❌ 間違った順序（IDENTIFIERが先にマッチしてしまう）
IDENTIFIER: /[a-z]+/
KEYWORD_IF: "if"
```

### インポートと無視

```ebnf
// 共通トークンをインポート
%import common.WS           // 空白
%import common.NEWLINE      // 改行
%import common.NUMBER       // 数値
%import common.CNAME        // C言語風識別子

// トークンを無視
%ignore WS
%ignore COMMENT

// 改行を無視しない（文法的に重要な場合）
// %ignore NEWLINE は書かない
```

### 名前付きルール

AST変換を簡単にするため、ルールに名前を付けます：

```ebnf
// "-> name" でルールに名前を付ける
expression: number "+" number  -> add
          | number "-" number  -> subtract
          | number "*" number  -> multiply
          | number "/" number  -> divide

// 変換時に使用
class MyTransformer(Transformer):
    def add(self, items):
        left, right = items
        return left + right
```

---

## パーサーセットアップ

### ファイル構成

```
distribution/
├── grammar/
│   ├── main.lark          # メイン文法
│   ├── expressions.lark   # 式文法（サブモジュール）
│   └── statements.lark    # 文文法（サブモジュール）
├── parser.py              # パーサー初期化
└── transformers/
    └── ast_transformer.py # AST変換ロジック
```

### パーサー初期化

```python
# parser.py

from pathlib import Path
from lark import Lark

GRAMMAR_DIR = Path(__file__).parent / "grammar"

def create_parser() -> Lark:
    """DSLパーサーを初期化"""
    grammar_path = GRAMMAR_DIR / "main.lark"

    with open(grammar_path, "r", encoding="utf-8") as f:
        grammar = f.read()

    return Lark(
        grammar,
        start='start',          # エントリーポイント
        parser='earley',        # 解析戦略
        propagate_positions=True,  # 行番号・列番号を保持
        maybe_placeholders=False,  # 曖昧性を許さない
    )

# シングルトンパターン
_parser = None

def get_parser() -> Lark:
    """グローバルパーサーインスタンスを取得"""
    global _parser
    if _parser is None:
        _parser = create_parser()
    return _parser
```

### パーサーオプション

```python
Lark(
    grammar,

    # エントリーポイント
    start='start',

    # 解析戦略（'earley', 'lalr', 'cyk'）
    parser='earley',

    # 位置情報を保持（エラー報告に必要）
    propagate_positions=True,

    # トークナイザー（'auto', 'standard', 'contextual'）
    lexer='auto',

    # 曖昧性処理
    ambiguity='explicit',  # 曖昧な文法でエラー

    # キャッシュファイルを使用（起動高速化）
    cache=True,

    # デバッグモード
    debug=False,
)
```

---

## パース処理フロー

### 基本的なパースフロー

```python
from lark import Lark
from lark.exceptions import LarkError

def parse_dsl(code: str):
    """DSLコードをパースしてASTを返す"""
    parser = get_parser()

    try:
        # パース実行
        tree = parser.parse(code)
        return tree

    except LarkError as e:
        # パースエラーをキャッチ
        raise SyntaxError(f"Parse error: {e}")
```

### パース → 変換フロー

```python
from lark import Transformer

class ASTTransformer(Transformer):
    """Lark Tree → ドメインモデル変換"""

    def number(self, items):
        value = items[0]
        return int(value)

    def add(self, items):
        left, right = items
        return left + right

def compile_dsl(code: str):
    """DSLコード → ドメインモデル"""
    parser = get_parser()
    transformer = ASTTransformer()

    # 1. パース
    tree = parser.parse(code)

    # 2. 変換
    result = transformer.transform(tree)

    return result
```

### デバッグ出力

```python
def debug_parse(code: str):
    """パース結果をデバッグ出力"""
    parser = get_parser()
    tree = parser.parse(code)

    # Pretty print
    print(tree.pretty())

    # S式表記
    print(tree)
```

出力例：

```
start
  add
    number	10
    number	5

Tree('start', [Tree('add', [Tree('number', [Token('NUMBER', '10')]), Tree('number', [Token('NUMBER', '5')])])])
```

---

## エラーハンドリング

### Larkエラー種類

| 例外 | 発生条件 | 対処法 |
|------|---------|--------|
| `UnexpectedToken` | 予期しないトークン | 構文エラー箇所を報告 |
| `UnexpectedCharacters` | 未定義文字 | トークン定義を確認 |
| `UnexpectedEOF` | 不完全な入力 | 閉じ括弧等の不足 |
| `VisitError` | Transformer内エラー | 変換ロジックのバグ |

### エラーキャッチ

```python
from lark.exceptions import (
    UnexpectedToken,
    UnexpectedCharacters,
    UnexpectedEOF,
    VisitError,
)

def safe_parse(code: str):
    """エラーハンドリング付きパース"""
    parser = get_parser()

    try:
        tree = parser.parse(code)
        return tree

    except UnexpectedToken as e:
        line = e.line
        column = e.column
        expected = e.expected
        got = e.token

        raise SyntaxError(
            f"Line {line}, column {column}: "
            f"Expected {expected}, got {got}"
        )

    except UnexpectedCharacters as e:
        line = e.line
        column = e.column
        char = e.char

        raise SyntaxError(
            f"Line {line}, column {column}: "
            f"Unexpected character '{char}'"
        )

    except UnexpectedEOF as e:
        expected = e.expected

        raise SyntaxError(
            f"Unexpected end of file. Expected: {expected}"
        )

    except VisitError as e:
        # Transformer内のエラー
        original = e.orig_exc
        raise RuntimeError(
            f"AST transformation failed: {original}"
        )
```

### エラーメッセージ強化

```python
def format_parse_error(code: str, error: UnexpectedToken) -> str:
    """ユーザーフレンドリーなエラーメッセージ"""
    lines = code.split('\n')
    error_line = lines[error.line - 1]

    # エラー箇所を視覚的に表示
    marker = ' ' * (error.column - 1) + '^'

    return f"""
Syntax Error at line {error.line}, column {error.column}:

{error_line}
{marker}

Expected: {', '.join(error.expected)}
Got: {error.token}
"""
```

出力例：

```
Syntax Error at line 3, column 8:

x = 10 +
       ^

Expected: NUMBER, IDENTIFIER
Got: <EOF>
```

---

## ASTノード設計

### Lark Treeの構造

```python
from lark import Tree, Token

# Tree構造
Tree('rule_name', [child1, child2, ...])

# Tokenオブジェクト
Token('TOKEN_TYPE', 'value')
```

例：

```python
# DSL: x = 10 + 5
tree = Tree('assignment', [
    Token('IDENTIFIER', 'x'),
    Tree('add', [
        Tree('number', [Token('NUMBER', '10')]),
        Tree('number', [Token('NUMBER', '5')]),
    ])
])
```

### ドメインモデルへの変換

Lark TreeをPython dataclassに変換します：

```python
from dataclasses import dataclass
from typing import Any

@dataclass
class NumberNode:
    value: int

@dataclass
class AddNode:
    left: Any
    right: Any

@dataclass
class AssignmentNode:
    name: str
    value: Any
```

### メタデータの保持

エラー報告のため、位置情報を保持します：

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class Position:
    line: int
    column: int
    end_line: int
    end_column: int

@dataclass
class BaseNode:
    pos: Optional[Position] = None

@dataclass
class NumberNode(BaseNode):
    value: int
```

---

## Transformerパターン

### 基本的なTransformer

```python
from lark import Transformer, v_args

class ASTTransformer(Transformer):
    """Lark Tree → ドメインモデル変換"""

    # @v_args(inline=True) で引数を展開
    @v_args(inline=True)
    def number(self, token):
        return NumberNode(value=int(token))

    @v_args(inline=True)
    def add(self, left, right):
        return AddNode(left=left, right=right)

    @v_args(inline=True)
    def assignment(self, name, value):
        return AssignmentNode(name=str(name), value=value)
```

### Visitorパターン

Transformerは破壊的変換です。非破壊的走査にはVisitorを使います：

```python
from lark import Visitor

class ASTValidator(Visitor):
    """ASTを走査してバリデーション"""

    def __init__(self):
        self.errors = []

    def number(self, tree):
        value = int(tree.children[0])
        if value < 0:
            self.errors.append(f"Negative number not allowed: {value}")

    def assignment(self, tree):
        name = str(tree.children[0])
        if name.startswith('_'):
            self.errors.append(f"Underscore prefix not allowed: {name}")

# 使用例
validator = ASTValidator()
validator.visit(tree)

if validator.errors:
    print("Validation errors:")
    for error in validator.errors:
        print(f"  - {error}")
```

### 位置情報の保持

```python
from lark import Transformer, Token, Tree

class PositionPreservingTransformer(Transformer):
    """位置情報を保持するTransformer"""

    def _get_position(self, item) -> Optional[Position]:
        """Tree/Tokenから位置情報を取得"""
        if isinstance(item, Tree) and hasattr(item, 'meta'):
            meta = item.meta
            return Position(
                line=meta.line,
                column=meta.column,
                end_line=meta.end_line,
                end_column=meta.end_column,
            )
        elif isinstance(item, Token) and hasattr(item, 'line'):
            return Position(
                line=item.line,
                column=item.column,
                end_line=item.end_line,
                end_column=item.end_column,
            )
        return None

    def number(self, items):
        token = items[0]
        return NumberNode(
            value=int(token),
            pos=self._get_position(token),
        )
```

### マルチステージ変換

複雑なDSLでは、複数のTransformerを段階的に適用します：

```python
# Stage 1: 構文糖衣の展開
class SugarExpander(Transformer):
    def shorthand(self, items):
        # "x += 5" → "x = x + 5"
        return self._expand_compound_assignment(items)

# Stage 2: ドメインモデル構築
class DomainBuilder(Transformer):
    def assignment(self, items):
        return AssignmentNode(name=items[0], value=items[1])

# 適用
tree = parser.parse(code)
tree = SugarExpander().transform(tree)
result = DomainBuilder().transform(tree)
```

---

## 関連ドキュメント

### このリファレンス内

- [ARCHITECTURE.md](ARCHITECTURE.md) - 全体像
- [VALIDATION_PATTERNS.md](VALIDATION_PATTERNS.md) - パース後のバリデーション
- [IR_GENERATION_PATTERNS.md](IR_GENERATION_PATTERNS.md) - AST → CompiledSession変換

### Oidunaドキュメント

- [Distribution Guide](../../../../oiduna/docs/DISTRIBUTION_GUIDE.md) - Distribution実装全体像

### 外部リソース

- [Lark公式ドキュメント](https://lark-parser.readthedocs.io/)
- [Lark GitHub](https://github.com/lark-parser/lark)
- [EBNF記法解説](https://en.wikipedia.org/wiki/Extended_Backus%E2%80%93Naur_form)

---

**Last Updated**: 2026-02-24
**Scope**: DSL非依存のパーサー統合パターン
**Status**: ✅ 完成
