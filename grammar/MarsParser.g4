parser grammar MarsParser;

options {
  tokenVocab = MarsLexer;
}

// Root
program: statement* EOF;

// Statements
statement
  : environmentDecl
  | trackDecl
  | patternDecl
  | applyStmt
  ;

// Environment declaration
environmentDecl: ENVIRONMENT LBRACE property* RBRACE;

// Track declaration
trackDecl: TRACK IDENTIFIER LBRACE property* RBRACE;

// Pattern declaration
patternDecl: IDENTIFIER ASSIGN expr;

// Apply statement
applyStmt: APPLY expr;

// Property
property: IDENTIFIER COLON expr;

// Expression
expr
  : NUMBER
  | STRING
  | IDENTIFIER
  ;
