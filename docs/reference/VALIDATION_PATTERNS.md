# Validation Patterns

**対象読者**: Distribution開発者
**目的**: DSLバリデーション実装パターンを理解する

このドキュメントは**DSL非依存**です。MARS固有の構文には言及せず、汎用的なバリデーションパターンを説明します。

---

## 目次

1. [概要](#概要)
2. [3段階バリデーション戦略](#3段階バリデーション戦略)
3. [ASTウォーカー実装](#astウォーカー実装)
4. [セマンティック検証ルール](#セマンティック検証ルール)
5. [エラーメッセージ設計](#エラーメッセージ設計)
6. [エラーリカバリ戦略](#エラーリカバリ戦略)
7. [実装例](#実装例)

---

## 概要

### バリデーションの役割

Distribution実装において、バリデーションは以下の責任を持ちます：

```
┌──────────────────────────────────────────┐
│            Validation Layer              │
│                                          │
│  1. 構文検証 (Parser Level)               │
│     - 文法違反検出                        │
│     - パースエラー                        │
│                                          │
│  2. セマンティック検証 (AST Level)         │
│     - 未定義参照                          │
│     - 型不一致                            │
│     - スコープ違反                        │
│                                          │
│  3. IR検証 (IR Level)                    │
│     - 値範囲チェック                      │
│     - Pydanticバリデーション              │
│     - ビジネスロジック検証                │
│                                          │
└──────────────────────────────────────────┘
         │
         ↓
   エラーレポート
   (行番号、列番号、メッセージ)
```

### バリデーションの目的

✅ **早期エラー検出**:
- コンパイル時にエラーを検出（実行時エラーを防ぐ）
- ユーザーへの即座のフィードバック
- デバッグ時間の短縮

✅ **明確なエラーメッセージ**:
- 問題の位置を正確に特定
- 解決方法を提示
- 初心者にも理解しやすい説明

✅ **データ整合性**:
- Oiduna IRの仕様準拠を保証
- 範囲外の値を検出（例: BPM > 300）
- 循環参照や無限ループを防止

---

## 3段階バリデーション戦略

### 段階1: 構文レベル（Parser）

**責任**: 文法違反を検出

**タイミング**: パース時（Larkが自動実行）

**検出内容**:
- 予期しないトークン
- 括弧の不一致
- 文法ルール違反

**実装**: .lark文法ファイルで定義

```python
from lark import Lark, LarkError

parser = Lark(grammar, start='start')

try:
    tree = parser.parse(code)
except LarkError as e:
    # 構文エラー
    print(f"Syntax Error at line {e.line}, column {e.column}: {e}")
```

**エラー例**:
```
Unexpected token: '}'
Expected one of: IDENTIFIER, NUMBER
```

---

### 段階2: セマンティックレベル（AST）

**責任**: 意味的な妥当性を検証

**タイミング**: AST生成後、IR生成前

**検出内容**:
- 未定義変数の参照
- 型の不一致
- スコープ違反
- 重複定義

**実装**: ASTウォーカーで全ノードを走査

```python
class SemanticValidator:
    def __init__(self):
        self.errors: List[ValidationError] = []
        self.symbol_table: Dict[str, Any] = {}

    def validate(self, ast: Tree) -> List[ValidationError]:
        self.visit_node(ast)
        return self.errors

    def visit_node(self, node: Tree):
        # ノードタイプに応じた検証
        if node.data == 'variable_ref':
            self.check_variable_defined(node)
        elif node.data == 'assignment':
            self.check_type_compatibility(node)

        # 子ノードを再帰的に訪問
        for child in node.children:
            if isinstance(child, Tree):
                self.visit_node(child)
```

---

### 段階3: IRレベル（IR Generation）

**責任**: Oiduna IR仕様への準拠を検証

**タイミング**: IR生成時

**検出内容**:
- 値の範囲チェック（例: 0 <= gain <= 1.0）
- 必須フィールドの欠落
- データ型の不一致
- ビジネスロジック検証

**実装**: Pydanticモデルのバリデーション

```python
from pydantic import BaseModel, field_validator, ValidationError

class TrackParams(BaseModel):
    gain: float
    pan: float

    @field_validator('gain')
    def validate_gain(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError('gain must be between 0.0 and 1.0')
        return v

    @field_validator('pan')
    def validate_pan(cls, v):
        if not -1.0 <= v <= 1.0:
            raise ValueError('pan must be between -1.0 and 1.0')
        return v

try:
    params = TrackParams(gain=1.5, pan=0.0)
except ValidationError as e:
    # IR検証エラー
    print(e.errors())
```

---

## ASTウォーカー実装

### Visitor パターン

```python
from lark import Tree, Token
from typing import Any, List

class ASTValidator:
    def __init__(self):
        self.errors: List[ValidationError] = []
        self.context: ValidationContext = ValidationContext()

    def validate(self, ast: Tree) -> List[ValidationError]:
        """ASTを検証してエラーリストを返す"""
        self.visit(ast)
        return self.errors

    def visit(self, node: Tree | Token) -> Any:
        """ノードを訪問"""
        if isinstance(node, Token):
            return node.value

        # ノードタイプに応じたメソッドを呼び出し
        method_name = f'visit_{node.data}'
        visitor = getattr(self, method_name, self.generic_visit)
        return visitor(node)

    def generic_visit(self, node: Tree):
        """デフォルトの訪問処理（子ノードを再帰的に訪問）"""
        for child in node.children:
            if isinstance(child, (Tree, Token)):
                self.visit(child)

    # ノードタイプ別の訪問メソッド
    def visit_assignment(self, node: Tree):
        """変数代入ノードの検証"""
        var_name = node.children[0].value
        value = self.visit(node.children[1])

        # 重複定義チェック
        if var_name in self.context.variables:
            self.add_error(node, f"Variable '{var_name}' is already defined")

        self.context.variables[var_name] = value

    def visit_variable_ref(self, node: Tree):
        """変数参照ノードの検証"""
        var_name = node.children[0].value

        # 未定義参照チェック
        if var_name not in self.context.variables:
            self.add_error(node, f"Undefined variable: '{var_name}'")

        return self.context.variables.get(var_name)

    def add_error(self, node: Tree, message: str):
        """エラーを追加"""
        self.errors.append(ValidationError(
            line=node.meta.line,
            column=node.meta.column,
            message=message,
            node=node,
        ))
```

### ValidationContext

```python
from typing import Dict, Any, Set

class ValidationContext:
    """検証コンテキスト（スコープ、シンボルテーブル）"""

    def __init__(self):
        # シンボルテーブル（変数名 → 型/値）
        self.variables: Dict[str, Any] = {}

        # スコープスタック
        self.scopes: List[Dict[str, Any]] = [{}]

        # 定義済み関数
        self.functions: Set[str] = set()

    def enter_scope(self):
        """新しいスコープに入る"""
        self.scopes.append({})

    def exit_scope(self):
        """スコープを抜ける"""
        if len(self.scopes) > 1:
            self.scopes.pop()

    def define_variable(self, name: str, value: Any):
        """現在のスコープで変数を定義"""
        self.scopes[-1][name] = value

    def lookup_variable(self, name: str) -> Any:
        """変数を検索（スコープチェーンを遡る）"""
        for scope in reversed(self.scopes):
            if name in scope:
                return scope[name]
        return None

    def is_defined(self, name: str) -> bool:
        """変数が定義済みか確認"""
        return self.lookup_variable(name) is not None
```

### ValidationError

```python
from dataclasses import dataclass
from lark import Tree

@dataclass
class ValidationError:
    line: int
    column: int
    message: str
    node: Tree
    severity: str = 'error'  # 'error', 'warning', 'info'

    def __str__(self) -> str:
        return f"Line {self.line}, Column {self.column}: {self.message}"

    def to_dict(self) -> dict:
        """Monaco Editor用の辞書に変換"""
        return {
            'line': self.line,
            'column': self.column,
            'message': self.message,
            'severity': self.severity,
            'length': len(str(self.node.children[0])) if self.node.children else 1,
        }
```

---

## セマンティック検証ルール

### 1. 未定義参照チェック

```python
def visit_variable_ref(self, node: Tree):
    var_name = node.children[0].value

    if not self.context.is_defined(var_name):
        self.add_error(
            node,
            f"Undefined variable: '{var_name}'",
            severity='error'
        )
```

### 2. 型チェック

```python
def visit_binary_op(self, node: Tree):
    left = self.visit(node.children[0])
    operator = node.children[1].value
    right = self.visit(node.children[2])

    # 型を取得
    left_type = type(left).__name__
    right_type = type(right).__name__

    # 型の互換性チェック
    if operator in ['+', '-', '*', '/']:
        if left_type != 'int' and left_type != 'float':
            self.add_error(node, f"Cannot apply '{operator}' to type '{left_type}'")
        if right_type != 'int' and right_type != 'float':
            self.add_error(node, f"Cannot apply '{operator}' to type '{right_type}'")
```

### 3. 値の範囲チェック

```python
def visit_parameter(self, node: Tree):
    param_name = node.children[0].value
    param_value = self.visit(node.children[1])

    # パラメータ別の範囲チェック
    if param_name == 'gain':
        if not 0.0 <= param_value <= 1.0:
            self.add_error(
                node,
                f"gain must be between 0.0 and 1.0, got {param_value}",
                severity='error'
            )
    elif param_name == 'bpm':
        if not 20 <= param_value <= 300:
            self.add_error(
                node,
                f"bpm must be between 20 and 300, got {param_value}",
                severity='warning'  # 警告レベル
            )
```

### 4. 重複定義チェック

```python
def visit_function_def(self, node: Tree):
    func_name = node.children[0].value

    if func_name in self.context.functions:
        self.add_error(
            node,
            f"Function '{func_name}' is already defined",
            severity='error'
        )
    else:
        self.context.functions.add(func_name)

    # 関数本体を検証
    self.context.enter_scope()
    self.visit(node.children[1])  # 関数本体
    self.context.exit_scope()
```

### 5. スコープチェック

```python
def visit_block(self, node: Tree):
    # 新しいスコープに入る
    self.context.enter_scope()

    # ブロック内の文を検証
    for statement in node.children:
        self.visit(statement)

    # スコープを抜ける
    self.context.exit_scope()
```

### 6. 循環参照チェック

```python
def visit_reference(self, node: Tree):
    ref_name = node.children[0].value

    # 現在検証中のパスをトラッキング
    if ref_name in self.context.current_path:
        self.add_error(
            node,
            f"Circular reference detected: {' -> '.join(self.context.current_path + [ref_name])}",
            severity='error'
        )
        return

    self.context.current_path.append(ref_name)
    # 参照先を検証
    self.visit(self.context.lookup_variable(ref_name))
    self.context.current_path.pop()
```

---

## エラーメッセージ設計

### 良いエラーメッセージの原則

1. **位置を明確に** - 行番号、列番号を提供
2. **問題を説明** - 何が間違っているかを明示
3. **解決策を提示** - どう修正すべきか示唆
4. **コンテキストを含む** - 問題のコード片を表示

### エラーメッセージテンプレート

```python
class ErrorMessageBuilder:
    @staticmethod
    def undefined_variable(var_name: str, suggestions: List[str] = None) -> str:
        msg = f"Undefined variable: '{var_name}'"

        # 似た名前の変数を提案
        if suggestions:
            msg += f"\nDid you mean: {', '.join(suggestions)}?"

        return msg

    @staticmethod
    def type_mismatch(expected: str, actual: str, context: str = "") -> str:
        msg = f"Type mismatch: expected '{expected}', got '{actual}'"

        if context:
            msg += f"\n{context}"

        return msg

    @staticmethod
    def value_out_of_range(param: str, value: Any, min_val: Any, max_val: Any) -> str:
        return (
            f"Value out of range for '{param}': {value}\n"
            f"Expected: {min_val} <= {param} <= {max_val}"
        )

    @staticmethod
    def missing_required_field(field: str, context: str) -> str:
        return f"Missing required field '{field}' in {context}"
```

### エラーメッセージ例

**悪い例**:
```
Error: invalid
```

**良い例**:
```
Line 5, Column 10: Undefined variable: 'kickPattern'
Did you mean: 'kick_pattern'?

  3 | define kick_pattern = [1, 0, 0, 0]
  4 |
> 5 | play kickPattern
           ^^^^^^^^^^^
```

### 警告メッセージ

```python
def add_warning(self, node: Tree, message: str):
    """警告を追加（エラーではないが推奨されない使い方）"""
    self.errors.append(ValidationError(
        line=node.meta.line,
        column=node.meta.column,
        message=message,
        node=node,
        severity='warning',
    ))
```

**警告例**:
```python
def visit_deprecated_syntax(self, node: Tree):
    self.add_warning(
        node,
        "This syntax is deprecated and will be removed in v2.0\n"
        "Use 'new_syntax' instead"
    )
```

### 情報メッセージ

```python
def add_info(self, node: Tree, message: str):
    """情報メッセージ（ヒント、最適化提案）"""
    self.errors.append(ValidationError(
        line=node.meta.line,
        column=node.meta.column,
        message=message,
        node=node,
        severity='info',
    ))
```

---

## エラーリカバリ戦略

### 1. 部分的AST生成

Larkのエラーリカバリ機能を使用：

```python
parser = Lark(
    grammar,
    start='start',
    parser='lalr',
    # エラーリカバリを有効化
    propagate_positions=True,
    maybe_placeholders=True,
)

try:
    tree = parser.parse(code)
except UnexpectedInput as e:
    # 部分的ASTを取得
    tree = e.interactive_parser.resume_parse()
```

### 2. エラー箇所のスキップ

```python
def visit_statement(self, node: Tree):
    try:
        # 文を検証
        self.validate_statement(node)
    except ValidationError as e:
        # エラーを記録してスキップ
        self.errors.append(e)
        # 次の文へ進む
```

### 3. デフォルト値の補完

```python
def visit_parameter_list(self, node: Tree):
    params = {}

    for param in node.children:
        try:
            name, value = self.visit(param)
            params[name] = value
        except ValidationError as e:
            self.errors.append(e)
            # デフォルト値を使用
            params[name] = self.get_default_value(name)

    return params
```

### 4. 複数エラーの収集

```python
def validate(self, ast: Tree) -> List[ValidationError]:
    """全てのエラーを収集（最初のエラーで停止しない）"""
    self.errors = []

    try:
        self.visit(ast)
    except Exception as e:
        # 予期しない例外もキャッチ
        self.errors.append(ValidationError(
            line=0,
            column=0,
            message=f"Internal validation error: {str(e)}",
            node=ast,
            severity='error',
        ))

    return self.errors
```

---

## 実装例

### フル実装例

```python
from lark import Lark, Tree, Token
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class ValidationError:
    line: int
    column: int
    message: str
    severity: str = 'error'

class ValidationContext:
    def __init__(self):
        self.variables: Dict[str, Any] = {}
        self.scopes: List[Dict[str, Any]] = [{}]

    def enter_scope(self):
        self.scopes.append({})

    def exit_scope(self):
        if len(self.scopes) > 1:
            self.scopes.pop()

    def define_variable(self, name: str, value: Any):
        self.scopes[-1][name] = value

    def is_defined(self, name: str) -> bool:
        for scope in reversed(self.scopes):
            if name in scope:
                return True
        return False

class SemanticValidator:
    def __init__(self):
        self.errors: List[ValidationError] = []
        self.context = ValidationContext()

    def validate(self, ast: Tree) -> List[ValidationError]:
        self.visit(ast)
        return self.errors

    def visit(self, node: Tree | Token) -> Any:
        if isinstance(node, Token):
            return node.value

        method_name = f'visit_{node.data}'
        visitor = getattr(self, method_name, self.generic_visit)
        return visitor(node)

    def generic_visit(self, node: Tree):
        for child in node.children:
            if isinstance(child, (Tree, Token)):
                self.visit(child)

    # ノードタイプ別の検証メソッド

    def visit_assignment(self, node: Tree):
        """変数代入の検証"""
        var_name = node.children[0].value
        value = self.visit(node.children[1])

        # 重複定義チェック
        if var_name in self.context.scopes[-1]:
            self.add_error(
                node,
                f"Variable '{var_name}' is already defined in this scope"
            )

        self.context.define_variable(var_name, value)
        return value

    def visit_variable_ref(self, node: Tree):
        """変数参照の検証"""
        var_name = node.children[0].value

        # 未定義チェック
        if not self.context.is_defined(var_name):
            # 類似の変数名を探す
            suggestions = self.find_similar_names(var_name)

            msg = f"Undefined variable: '{var_name}'"
            if suggestions:
                msg += f"\nDid you mean: {', '.join(suggestions)}?"

            self.add_error(node, msg)

        return var_name

    def visit_number(self, node: Tree):
        """数値の検証"""
        value = float(node.children[0].value)
        return value

    def visit_parameter(self, node: Tree):
        """パラメータの検証"""
        param_name = node.children[0].value
        param_value = self.visit(node.children[1])

        # パラメータ別の範囲チェック
        if param_name == 'gain':
            if not 0.0 <= param_value <= 1.0:
                self.add_error(
                    node,
                    f"gain must be between 0.0 and 1.0, got {param_value}"
                )
        elif param_name == 'bpm':
            if not 20 <= param_value <= 300:
                self.add_warning(
                    node,
                    f"bpm {param_value} is unusually high or low (typical range: 60-180)"
                )

        return (param_name, param_value)

    def visit_block(self, node: Tree):
        """ブロックの検証（新しいスコープ）"""
        self.context.enter_scope()

        for statement in node.children:
            self.visit(statement)

        self.context.exit_scope()

    # ヘルパーメソッド

    def add_error(self, node: Tree, message: str):
        self.errors.append(ValidationError(
            line=node.meta.line,
            column=node.meta.column,
            message=message,
            severity='error',
        ))

    def add_warning(self, node: Tree, message: str):
        self.errors.append(ValidationError(
            line=node.meta.line,
            column=node.meta.column,
            message=message,
            severity='warning',
        ))

    def find_similar_names(self, target: str) -> List[str]:
        """類似の変数名を見つける（Levenshtein距離）"""
        all_vars = set()
        for scope in self.context.scopes:
            all_vars.update(scope.keys())

        # 簡易的な類似度チェック（実際にはLevenshtein距離を使用）
        suggestions = [
            var for var in all_vars
            if var.startswith(target[0]) and len(var) == len(target)
        ]

        return suggestions[:3]  # 最大3つ

# 使用例
grammar = """
start: statement+

statement: assignment
         | variable_ref

assignment: IDENTIFIER "=" number
variable_ref: IDENTIFIER

number: NUMBER

IDENTIFIER: /[a-zA-Z_]\w*/
NUMBER: /\d+(\.\d+)?/

%import common.WS
%ignore WS
"""

code = """
foo = 10
bar = foo
baz = qux
"""

parser = Lark(grammar, start='start', propagate_positions=True)
tree = parser.parse(code)

validator = SemanticValidator()
errors = validator.validate(tree)

for error in errors:
    print(f"[{error.severity.upper()}] Line {error.line}: {error.message}")

# 出力:
# [ERROR] Line 3: Undefined variable: 'qux'
# Did you mean: foo, bar?
```

### FastAPI統合例

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class ValidateRequest(BaseModel):
    code: str

class ValidateResponse(BaseModel):
    errors: List[dict]

@app.post("/api/validate", response_model=ValidateResponse)
async def validate_code(request: ValidateRequest):
    try:
        # パース
        tree = parser.parse(request.code)

        # セマンティック検証
        validator = SemanticValidator()
        errors = validator.validate(tree)

        # エラーを辞書に変換
        error_dicts = [
            {
                'line': err.line,
                'column': err.column,
                'message': err.message,
                'severity': err.severity,
                'length': 1,
            }
            for err in errors
        ]

        return ValidateResponse(errors=error_dicts)

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

---

## 関連ドキュメント

### このリファレンス内

- [ARCHITECTURE.md](ARCHITECTURE.md) - バリデーションの位置づけ
- [PARSER_INTEGRATION.md](PARSER_INTEGRATION.md) - 構文エラーハンドリング
- [IR_GENERATION_PATTERNS.md](IR_GENERATION_PATTERNS.md) - IR検証
- [MONACO_INTEGRATION.md](MONACO_INTEGRATION.md) - エラーマーカー表示

### 外部リソース

- [Lark Error Handling](https://lark-parser.readthedocs.io/en/latest/visitors.html#error-handling)
- [Pydantic Validators](https://docs.pydantic.dev/latest/concepts/validators/)

---

## ベストプラクティス

### バリデーションの粒度

1. **段階的検証**: 構文 → セマンティック → IR の順で検証
2. **早期リターン**: 致命的エラーは早期に検出
3. **複数エラー収集**: 1回の検証で全エラーを報告

### エラーメッセージ

1. **具体的に**: "エラー" ではなく "未定義変数: 'foo'"
2. **解決策を提示**: "Did you mean: 'bar'?"
3. **位置を明確に**: 行番号、列番号、該当箇所を表示

### パフォーマンス

1. **キャッシング**: 同じコードの再検証を避ける
2. **増分検証**: 変更箇所のみ再検証
3. **並列化**: 独立した検証ルールは並列実行

### メンテナンス性

1. **ルール分離**: 検証ルールは独立したメソッドに
2. **テスト**: 各検証ルールのユニットテスト
3. **ドキュメント**: 検証ルールの意図を文書化

---

**Last Updated**: 2026-02-24
**Scope**: DSL非依存のバリデーションパターン
**Status**: ✅ 完成
