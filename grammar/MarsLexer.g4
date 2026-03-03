lexer grammar MarsLexer;

// Keywords
ENVIRONMENT: 'Environment';
TRACK: 'Track';
APPLY: 'apply';

// Literals
NUMBER: [0-9]+ ('.' [0-9]+)?;
STRING: '"' (~["\r\n])* '"';
IDENTIFIER: [a-zA-Z_][a-zA-Z0-9_]*;

// Operators
ASSIGN: '=';
COLON: ':';
COMMA: ',';
LPAREN: '(';
RPAREN: ')';
LBRACE: '{';
RBRACE: '}';

// Whitespace
WS: [ \t\r\n]+ -> skip;
COMMENT: '//' ~[\r\n]* -> skip;
