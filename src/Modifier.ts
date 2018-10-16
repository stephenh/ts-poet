
/** Available declaration modifiers. */
export enum Modifier {
  EXPORT = "export",
  PUBLIC = "public",
  PROTECTED = "protected",
  PRIVATE = "private",
  READONLY = "readonly",
  GET = "get",
  SET = "set",
  STATIC = "static",
  ABSTRACT = "abstract",
  DECLARE = "declare",
  CONST = "const",
  LET = "let",
  VAR = "var",
}

// should try a tsc transformer
export const ModifierOrder = [
  Modifier.EXPORT,
  Modifier.PUBLIC,
  Modifier.PROTECTED,
  Modifier.PRIVATE,
  Modifier.READONLY,
  Modifier.GET,
  Modifier.SET,
  Modifier.STATIC,
  Modifier.ABSTRACT,
  Modifier.DECLARE,
  Modifier.CONST,
  Modifier.LET,
  Modifier.VAR,
];
