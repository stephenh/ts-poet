import { StringBuffer } from "sb-js";

export function check(b: boolean, message: string) {
  if (!b) {
    throw new Error(message);
  }
}

// Based on original javapoet code; it looks like typescriptpoet has
// an extra branch to cover multi-line strings; haven't handled that yet.
export function stringLiteralWithQuotes(value: string, indent: string = "  "): string {
  const result = new StringBuffer("");
  result.add('"');
  for (let i = 0; i < value.length; i++) {
    const c = value.charAt(i);
    // trivial case: single quote must not be escaped
    if (c === '\'') {
      result.add("'");
      continue;
    }
    // trivial case: double quotes must be escaped
    if (c === '"') {
      result.add("\\\"");
      continue;
    }
    // default case: just let character literal do its work
    result.add(characterLiteralWithoutSingleQuotes(c));
    // need to append indent after linefeed?
    if (c === '\n' && i + 1 < value.length) {
      result.add("\"\n");
      result.add(indent);
      result.add(indent);
      result.add("+ \"");
    }
  }
  result.add('"');
  return result.toString();
}

function characterLiteralWithoutSingleQuotes(c: string): string {
  // see https://docs.oracle.com/javase/specs/jls/se7/html/jls-3.html#jls-3.10.6
  switch (c) {
    case '\b':
      return "\\b"; /* \u0008: backspace (BS) */
    case '\t':
      return "\\t"; /* \u0009: horizontal tab (HT) */
    case '\n':
      return "\\n"; /* \u000a: linefeed (LF) */
    case '\f':
      return "\\f"; /* \u000c: form feed (FF) */
    case '\r':
      return "\\r"; /* \u000d: carriage return (CR) */
    case '\"':
      return "\"";  /* \u0022: double quote (") */
    case '\'':
      return "\\'"; /* \u0027: single quote (') */
    case '\\':
      return "\\\\";  /* \u005c: backslash (\) */
    default:
      return c;
  }
}
