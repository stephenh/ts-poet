import { CodeWriter } from "./CodeWriter";
import { StringBuffer } from "./StringBuffer";
import { SymbolReferenceTracker } from "./SymbolReferenceContainer";
import { SymbolSpec } from "./SymbolSpecs";
import { check } from "./utils";

const NAMED_ARGUMENT = /^%([\w_]+):([\w]).*$/;
const LOWERCASE = /^[a-z]+[\w_]*$/;
const ARG_NAME = 1;
const TYPE_NAME = 2;
const NO_ARG_PLACEHOLDERS = ["%W", "%>", "%<", "%[", "%]"];

class TypeName {
  public reference(o: any): string {
    return "";
  }
}

export interface Dictionary<T> {
  [key: string]: T;
}

function isNoArgPlaceholder(c: string): boolean {
  return ['%', '>', '<', '[', ']', 'W'].indexOf(c) > -1;
}


/**
 * A fragment of a .ts file, potentially containing declarations, statements, and documentation.
 * Code blocks are not necessarily well-formed TypeScript code, and are not validated. This class
 * assumes tsc will check correctness later!
 *
 * Code blocks support placeholders like [java.text.Format]. This class uses a percent sign
 * `%` but has its own set of permitted placeholders:
 *
 *  * `%L` emits a *literal* value with no escaping. Arguments for literals may be strings,
 *    primitives, [type declarations][ClassSpec], [decorators][DecoratorSpec] and even other code
 *    blocks.
 *  * `%N` emits a *name*, using name collision avoidance where necessary. Arguments for names may
 *    be strings (actually any [character sequence][CharSequence]), [parameters][ParameterSpec],
 *    [properties][PropertySpec], [functions][FunSpec], and [types][ClassSpec].
 *  * `%S` escapes the value as a *string*, wraps it with double quotes, and emits that. For
 *    example, `6" sandwich` is emitted `"6\" sandwich"`.
 *  * `%T` emits a *type* reference. Types will be imported if possible. Arguments for types may be
 *    [classes][Class], [type mirrors][javax.lang.model.type.TypeMirror], and
 *    [elements][javax.lang.model.element.Element].
 *  * `%%` emits a percent sign.
 *  * `%W` emits a space or a newline, depending on its position on the line. This prefers to wrap
 *    lines before 100 columns.
 *  * `%>` increases the indentation level.
 *  * `%<` decreases the indentation level.
 *  * `%[` begins a statement. For multiline statements, every line after the first line is
 *    double-indented.
 *  * `%]` ends a statement.
 */

export class CodeBlock {

  constructor(
     public formatParts: string[],
     public args: any[],
     public referencedSymbols: Set<SymbolSpec>
  ) {}

  /** A heterogeneous list containing string literals and value placeholders.  */

  isEmpty() {
    return this.formatParts.length === 0;
  }

  isNotEmpty() {
    return !this.isEmpty();
  }

  /**
   * Returns a code block with `prefix` stripped off, or null if this code block doesn't start with
   * `prefix`.
   *
   * This is a pretty anyType implementation that might not cover cases like mismatched whitespace. We
   * could offer something more lenient if necessary.
   */
  private withoutPrefix(prefix: CodeBlock): CodeBlock | undefined {
    if (this.formatParts.length < prefix.formatParts.length) return undefined;
    if (this.args.length < prefix.args.length) return undefined;

    let prefixArgCount = 0;
    let firstFormatPart: string | undefined;

    // Walk through the formatParts of prefix to confirm that it's a of this.
    for (let index = 0; index < prefix.formatParts.length; index++) {
      const formatPart = prefix.formatParts[index];
      if (this.formatParts[index] !== formatPart) {
        // We've found a format part that doesn't match. If this is the very last format part check
        // for a string prefix match. If that doesn't match, we're done.
        if (index === prefix.formatParts.length - 1 && this.formatParts[index].startsWith(formatPart)) {
          firstFormatPart = this.formatParts[index].substring(formatPart.length)
        } else {
          return undefined;
        }
      }

      // If the matching format part has an argument, check that too.
      if (formatPart.startsWith("%") && !isNoArgPlaceholder(
         formatPart[1])) {
        if (this.args[prefixArgCount] !== prefix.args[prefixArgCount]) {
          return undefined; // Argument doesn't match.
        }
        prefixArgCount++;
      }
    }

    // We found a prefix. Prepare the suffix as a result.
    const resultFormatParts: string[] = [];
    if (firstFormatPart) {
      resultFormatParts.push(firstFormatPart);
    }
    for (let i = prefix.formatParts.length; i < this.formatParts.length; i++) {
      resultFormatParts.push(this.formatParts[i]);
    }

    const resultArgs: any[] = [];
    for (let i = prefix.args.length; i < this.args.length; i++) {
      resultArgs.push(this.args[i]);
    }

    return new CodeBlock(resultFormatParts, resultArgs, this.referencedSymbols);
  }

  /**
   * Returns a copy of the code block without leading and trailing no-arg placeholders
   * (`%W`, `%<`, `%>`, `%[`, `%]`).
   */
  private trim(): CodeBlock {
    let start = 0;
    let end = this.formatParts.length;
    while (start < end && NO_ARG_PLACEHOLDERS.indexOf(this.formatParts[start]) > -1) {
      start++;
    }
    while (start < end && NO_ARG_PLACEHOLDERS.indexOf(this.formatParts[end - 1]) > -1) {
      end--;
    }
    if (start > 0 || end < this.formatParts.length) {
      return new CodeBlock(this.formatParts.slice(start, end), this.args, this.referencedSymbols);
    } else {
      return this;
    }
  }

  toString(): string {
    const buffer = new StringBuffer();
    new CodeWriter(buffer).emitCodeBlock(this);
    return buffer.toString();
  }

  toBuilder(): Builder {
    const builder = new Builder()
    builder.formatParts.push(...this.formatParts);
    builder.args.push(...this.args);
    this.referencedSymbols.forEach(builder.referencedSymbols.add);
    return builder;
  }

  static of(format: string, ...args: any[]): CodeBlock {
    return new Builder().add(format, ...args).build();
  }

  static builder(): Builder {
    return new Builder();
  }

  static empty(): CodeBlock {
    return CodeBlock.builder().build();
  }

}

export class Builder implements SymbolReferenceTracker {
  readonly formatParts: string[] = [];
  readonly args: any[] = [];
  readonly referencedSymbols: Set<SymbolSpec> = new Set();

  isEmpty(): boolean {
    return this.formatParts.length === 0;
  }

  isNotEmpty(): boolean {
    return !this.isEmpty();
  }

  referenced(symbol: SymbolSpec) {
    this.referencedSymbols.add(symbol);
  }

  /**
   * Adds code using named arguments.
   *
   * Named arguments specify their name after the '%' followed by : and the corresponding type
   * character. Argument names consist of characters in `a-z, A-Z, 0-9, and _` and must start
   * with a lowercase character.
   *
   * For example, to refer to the type [java.lang.Integer] with the argument name `clazz` use a
   * format string containing `%clazz:T` and include the key `clazz` with value
   * `java.lang.Integer.class` in the argument map.
   */
  addNamed(format: string, args: Dictionary<any>): this {
    Object.keys(args).forEach(arg => {
      check(
        arg.match(LOWERCASE) !== null,
        `argument '${arg}' must start with a lowercase character`);
    });
    let p = 0;
    while (p < format.length) {
      const nextP = format.indexOf("%", p);
      if (nextP === -1) {
        this.formatParts.push(format.substring(p, format.length));
        break;
      }

      if (p !== nextP) {
        this.formatParts.push(format.substring(p, nextP));
        p = nextP;
      }

      let matchResult: RegExpMatchArray | null = null;
      const colon = format.indexOf(':', p);
      if (colon !== -1) {
        const endIndex = Math.min(colon + 2, format.length);
        matchResult = format.substring(p, endIndex).match(NAMED_ARGUMENT);
      }
      if (matchResult) {
        const argumentName = matchResult[ARG_NAME];
        check(args.hasOwnProperty(argumentName), `Missing named argument for %${argumentName}`);
        const formatChar = matchResult[TYPE_NAME].charAt(0);
        this.addArgument(format, formatChar, args[argumentName]);
        this.formatParts.push(`%${formatChar}`);
        // ugly copy/paste from earlier line
        const endIndex = Math.min(colon + 2, format.length);
        p = endIndex;
      } else {
        check(p < format.length - 1, "dangling % at end");
        check(
          isNoArgPlaceholder(format[p + 1]),
          `unknown format %${format[p + 1]} at ${p + 1} in '${format}'`);
        this.formatParts.push(format.substring(p, p + 2));
        p += 2;
      }
    }
    return this;
  }

  /**
   * Add code with positional or relative arguments.
   *
   * Relative arguments map 1:1 with the placeholders in the format string.
   *
   * Positional arguments use an index after the placeholder to identify which argument index
   * to use. For example, for a literal to reference the 3rd argument: "%3L" (1 based index)
   *
   * Mixing relative and positional arguments in a call to add is invalid and will result in an
   * error.
   */
  add(format: string, ...args: any[]): this {
    let hasRelative = false;
    let hasIndexed = false;

    let relativeParameterCount = 0;
    const indexedParameterCount: number[] = [];
    args.forEach(() => indexedParameterCount.push(0));

    let p = 0;
    while (p < format.length) {
      if (format[p] !== '%') {
        let nextP = format.indexOf('%', p + 1);
        if (nextP === -1) {
          nextP = format.length;
        }
        this.formatParts.push(format.substring(p, nextP));
        p = nextP;
        continue;
      }
      p++; // '%'.

      // Consume zero or more digits, leaving 'c' as the first non-digit char after the '%'.
      const indexStart = p;
      check(p < format.length, `dangling format characters in '${format}'`);
      let c = format[p++];
      while (c.match(/[0-9]/)) {
        check(p < format.length, `dangling format characters in '${format}'`);
        c = format[p++];
      }
      const indexEnd = p - 1;

      // If 'c' doesn't take an argument, we're done.
      if (isNoArgPlaceholder(c)) {
        check(indexStart === indexEnd, "%%, %>, %<, %[, %], and %W may not have an index");
        this.formatParts.push(`%${c}`);
        continue;
      }

      // Find either the indexed argument, or the relative argument. (0-based).
      let index: number;
      if (indexStart < indexEnd) {
        index = parseInt(format.substring(indexStart, indexEnd), 10) - 1;
        hasIndexed = true;
        if (args.length > 0) {
          indexedParameterCount[index % args.length]++ // modulo is needed, checked below anyway
        }
      } else {
        index = relativeParameterCount;
        hasRelative = true;
        relativeParameterCount++;
      }

      check(
        index >= 0 && index < args.length,
        `index ${index + 1} for '${format.substring(indexStart - 1, indexEnd + 1)}' not in range (received ${args.length} arguments)`);
      check(
        !hasIndexed || !hasRelative,
        "cannot mix indexed and positional parameters");

      this.addArgument(format, c, args[index]);

      this.formatParts.push(`%${c}`);
    }

    if (hasRelative) {
      check(
        relativeParameterCount >= args.length,
        `unused arguments: expected ${relativeParameterCount}, received ${args.length}`);
    }

    if (hasIndexed) {
      const unused: string[] = [];
      for (let i = 0; i < args.length; i++) {
        if (indexedParameterCount[i] === 0) {
          unused.push("%" + (i + 1));
        }
      }
      const s = (unused.length === 1) ? "" : "s";
      check(unused.length === 0, `unused argument${s}: ${unused.join(", ")}`);
    }

    return this;
  }


  private addArgument(format: string, c: string, arg: any) {
    switch (c) {
      case 'N': this.args.push(this.argToName(arg)); break;
      case 'L': this.args.push(this.argToLiteral(arg)); break;
      case 'S': this.args.push(this.argToString(arg)); break;
      case 'T': this.args.push(this.argToType(arg)); break;
      default: throw new Error(`invalid format string: '${format}'`);
    }
  }

  private argToName(o?: any): string {
    if (typeof o === 'string') {
      return o;
    } else if (o instanceof SymbolSpec) {
      return o.reference(this);
    } else if (o instanceof TypeName) {
      return o.reference(this);
      /*
    } else if (o instanceof ParameterSpec) {
      return o.name;
    } else if (o instanceof PropertySpec) {
      return o.name;
      */
    } else {
      throw new Error(`expected name but was ${o}`);
    }
  }

  private argToLiteral(o?: any): string {
    if (o instanceof SymbolSpec) {
      return o.reference(this);
    } else if (o instanceof CodeBlock) {
      o.referencedSymbols.forEach(this.referencedSymbols.add);
      return o.toString();
    } else if (o) {
      return o.toString();
    } else {
      throw new Error("not sure");
    }
  }

  private argToString(o?: any): string {
    return (o || "").toString();
  }

  private argToType(o?: any): TypeName {
    if (o instanceof TypeName) {
      o.reference(this);
      return o;
    } else {
      throw new Error(`expected type but was ${o}`)
    }
  }

  /**
   * @param controlFlow the control flow construct and its code, such as "if (foo == 5)".
   *     Shouldn't contain braces or newline characters.
   */
  beginControlFlow(controlFlow: string, ...args: any[]): this {
    this.add(`${controlFlow} {\n`, ...args);
    this.indent();
    return this;
  }

  /**
   * @param controlFlow the control flow construct and its code, such as "else if (foo == 10)".
   *     Shouldn't contain braces or newline characters.
   */
  nextControlFlow(controlFlow: string, ...args: any[]): this {
    this.unindent();
    this.add(`}\n$controlFlow {\n`, ...args);
    this.indent();
    return this;
  }

  endControlFlow(): this {
    this.unindent();
    this.add("}\n");
    return this;
  }

  addStatement(format: string, ...args: any[]): this {
    this.add("%[");
    this.add(format, ...args);
    this.add(";\n%]");
    return this;
  }

  addCode(codeBlock: CodeBlock): this {
    this.formatParts.concat(codeBlock.formatParts);
    this.args.concat(codeBlock.args);
    codeBlock.referencedSymbols.forEach(this.referencedSymbols.add);
    return this;
  }

  remove(matching: RegExp): this {
    const parts: string[] = [];
    let i = 0;
    while (i < this.formatParts.length) {
      const s = this.formatParts[i];
      if (s.match(matching)) {
        // if (parts.lastOrNull() == "%[" && formatParts.getOrNull(i + 1) == ";\n" && formatParts.getOrNull(i + 2) == "%]") {
        //   parts.removeAt(i - 1);
        //   i += 2;
        // }
      } else {
        // parts.add(s.replace(matching) { it.groups[2]!!.value } )
      }
      i += 1;
    }
    this.formatParts.length = 0;
    parts.forEach(p => this.formatParts.push(p));
    return this;
  }

  indent(): this {
    this.formatParts.push("%>");
    return this;
  }

  unindent(): this {
    this.formatParts.push("%<");
    return this;
  }

  build(): CodeBlock {
    return new CodeBlock(this.formatParts, this.args, this.referencedSymbols);
  }

}

/*
@JvmOverloads
fun Collection<CodeBlock>.joinToCode(separator: CharSequence = ", ", prefix: CharSequence = "",
                                                               suffix: CharSequence = ""): CodeBlock {
  const blocks = toTypedArray()
  const placeholders = Array(blocks.length) { "%L" }
  return CodeBlock.of(placeholders.joinTostring(separator, prefix, suffix), *blocks)
}
*/
