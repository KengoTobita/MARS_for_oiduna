/**
 * AST Types
 *
 * Abstract Syntax Tree node definitions for MARS DSL
 */

export interface ASTNode {
  type: string;
  location: Location;
}

export interface Location {
  start: Position;
  end: Position;
}

export interface Position {
  line: number;
  column: number;
}

export interface Program extends ASTNode {
  type: 'Program';
  statements: Statement[];
}

export type Statement =
  | EnvironmentDecl
  | TrackDecl
  | PatternDecl
  | ApplyStmt;

export interface EnvironmentDecl extends ASTNode {
  type: 'EnvironmentDecl';
  properties: Property[];
}

export interface TrackDecl extends ASTNode {
  type: 'TrackDecl';
  id: string;
  properties: Property[];
}

export interface PatternDecl extends ASTNode {
  type: 'PatternDecl';
  id: string;
  expression: Expression;
}

export interface ApplyStmt extends ASTNode {
  type: 'ApplyStmt';
  expression: Expression;
}

export interface Property extends ASTNode {
  type: 'Property';
  key: string;
  value: Expression;
}

export type Expression =
  | NumberLiteral
  | StringLiteral
  | Identifier;

export interface NumberLiteral extends ASTNode {
  type: 'NumberLiteral';
  value: number;
}

export interface StringLiteral extends ASTNode {
  type: 'StringLiteral';
  value: string;
}

export interface Identifier extends ASTNode {
  type: 'Identifier';
  name: string;
}
