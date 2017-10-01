package io.outfox.typescriptpoet


enum class Modifier {
  EXPORT,
  PUBLIC,
  PROTECTED,
  PRIVATE,
  READONLY,
  GET,
  SET,
  STATIC,
  ABSTRACT,
  DECLARE,
  CONST,
  LET,
  VAR;

  val keyword: String
    get() = name.toLowerCase()

}
