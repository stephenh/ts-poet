
import { CodeBlock } from "./CodeBlock";
import { DecoratorSpec } from "./DecoratorSpec";
import { EnumSpec } from "./EnumSpec";
import { LineWrapper } from "./LineWrapper";
import { Modifier, ModifierOrder } from "./Modifier";
import { StringBuffer } from "./StringBuffer";
import { SymbolReferenceTracker } from "./SymbolReferenceContainer";
import { Imported, SymbolSpec } from "./SymbolSpecs";
import { TypeName, TypeVariable } from "./TypeNames";
import { check, stringLiteralWithQuotes } from "./utils";
import { InterfaceSpec } from "./InterfaceSpec";

/**
 * Converts a [FileSpec] to a string suitable to both human- and tsc-consumption. This honors
 * imports, indentation, and deferred variable names.
 */
export class CodeWriter implements SymbolReferenceTracker {

  private readonly out: LineWrapper;
  private readonly referencedSymbols: Set<SymbolSpec> = new Set();
  private indentLevel = 0;
  private javaDoc = false;
  private comment = false;
  private trailingNewline = false;
  /**
   * When emitting a statement, this is the line of the statement currently being written. The first
   * line of a statement is indented normally and subsequent wrapped lines are double-indented. This
   * is -1 when the currently-written line isn't part of a statement.
   */
  private statementLine = -1;

  constructor(
    out: StringBuffer,
    private indentString: string = "  ",
    referencedSymbols: Set<SymbolSpec> = new Set()) {
    this.out = new LineWrapper(out, indentString, 100);
    referencedSymbols.forEach(this.referencedSymbols.add);
  }

  public referenced(symbol: SymbolSpec): void {
    this.referencedSymbols.add(symbol);
  }

  public indent(levels: number = 1): this {
    this.indentLevel += levels;
    return this;
  }

  public unindent(levels: number = 1): this {
    check(this.indentLevel - levels >= 0, `cannot unindent ${levels} from ${this.indentLevel}`);
    this.indentLevel -= levels;
    return this;
  }

  public emitComment(codeBlock: CodeBlock): void {
    this.trailingNewline = true; // Force the '//' prefix for the comment.
    this.comment = true
    try {
      this.emitCodeBlock(codeBlock);
      this.emit("\n");
    } finally {
      this.comment = false;
    }
  }

  public emitJavaDoc(javaDocCodeBlock: CodeBlock): void {
    if (javaDocCodeBlock.isEmpty()) {
      return;
    }
    this.emit("/**\n");
    this.javaDoc = true;
    try {
      this.emitCodeBlock(javaDocCodeBlock);
    } finally {
      this.javaDoc = false;
    }
    this.emit(" */\n");
  }

  public emitDecorators(decorators: DecoratorSpec[], inline: boolean) {
    decorators.forEach(decoratorSpec => {
      decoratorSpec.emit(this, inline);
      this.emit(inline ? " " : "\n");
    });
  }

  /**
   * Emits `modifiers` in the standard order. Modifiers in `implicitModifiers` will not
   * be emitted.
   */
  public emitModifiers(modifiers: Modifier[], implicitModifiers: Modifier[] = []) {
    if (modifiers.length === 0) {
      return;
    }
    ModifierOrder.forEach(m => {
      if (modifiers.indexOf(m) !== -1 && implicitModifiers.indexOf(m) === -1) {
        this.emit(m).emit(" ");
      }
    });
  }

  /**
   * Emit type variables with their bounds.
   *
   * This should only be used when declaring type variables; everywhere else bounds are omitted.
   */
  public emitTypeVariables(typeVariables: TypeVariable[]): void {
    if (typeVariables.length === 0) {
      return;
    }
    this.emit("<");
    let index = 0;
    typeVariables.forEach(typeVariable => {
      if (index > 0) {
        this.emit(", ");
      }
      let code = typeVariable.name;
      if (typeVariable.bounds.length > 0) {
        const parts: string[] = [];
        parts.push(" extends");
        let j = 0;
        typeVariable.bounds.forEach(bound => {
          if (j > 0) {
            parts.push(bound.combiner);
          }
          if (bound.modifier) {
            parts.push(bound.modifier);
          }
          parts.push(bound.type.reference(this));
          j++;
        });
        code += parts.join(" ");
      }
      this.emit(code);
      index++;
    });
    this.emit(">");
  }

  /* TODO
  public emitCode(s: string): void {
    this.emitCodeBlock(CodeBlock.of(s));
  }
  */

  public emitCode(format: string, ...args: any[]): void {
    this.emitCodeBlock(CodeBlock.of(format, ...args));
  }

  public emitCodeBlock(codeBlock: CodeBlock): this {
    // Transfer all symbols referenced in the code block
    codeBlock.referencedSymbols.forEach(this.referencedSymbols.add);

    let a = 0;
    codeBlock.formatParts.forEach(part => {
      switch (part) {
        case "%L": this.emitLiteral(codeBlock.args[a++]); break;
        case "%N": this.emit(codeBlock.args[a++] as string); break;
        case "%S": this.emitString(codeBlock.args[a++] as string); break;
        case "%T": this.emitTypeName(codeBlock.args[a++] as TypeName); break;
        case "%%": this.emit("%"); break;
        case "%>": this.indent(); break;
        case "%<": this.unindent(); break;
        case "%[": this.beginStatement(); break;
        case "%]": this.endStatement(); break;
        case "%W": this.emitWrappingSpace();
        // Handle deferred type.
        default: this.emit(part);
      }
    });
    return this;
  }

  private beginStatement(): void {
    check(this.statementLine === -1, "statement enter %[ followed by statement enter %[");
    this.statementLine = 0;
  }

  private endStatement(): void {
    check(this.statementLine !== -1, "statement exit %] has no matching statement enter %[");
    if (this.statementLine > 0) {
      this.unindent(2); // End a multi-line statement. Decrease the indentation level.
    }
    this.statementLine = -1;
  }

  private emitWrappingSpace(): this {
    this.out.wrappingSpace(this.indentLevel + 2);
    return this;
  }

  private emitTypeName(typeName: TypeName) {
    this.emit(typeName.reference(this));
  }

  private emitString(s?: string): void {
    // Emit null as a literal null: no quotes.
    this.emit(s ? stringLiteralWithQuotes(s) : "null");
  }

  private emitLiteral(o?: any): void {
    // TODO
    // is ClassSpec -> o.emit(this)
    if (o instanceof InterfaceSpec) {
      return o.emit(this);
    } else if (o instanceof EnumSpec) {
      return o.emit(this);
    } else if (o instanceof DecoratorSpec) {
      return o.emit(this, true, true);
    } else if (o instanceof CodeBlock) {
      this.emitCodeBlock(o);
    } else if (o) {
      // TODO Check if `if o` is right
      this.emit(o.toString());
    }
  }

  /**
   * Emits `s` with indentation as required. It's important that all code that writes to
   * [CodeWriter.out] does it through here, since we emit indentation lazily in order to avoid
   * unnecessary trailing whitespace.
   */
  public emit(s: string): this {
    let first = true;
    s.split('\n').forEach(line => {
      // Emit a newline character. Make sure blank lines in KDoc & comments look good.
      if (!first) {
        if ((this.javaDoc || this.comment) && this.trailingNewline) {
          this.emitIndentation();
          this.out.append(this.javaDoc ? " *" : "//");
        }
        this.out.append("\n");
        this.trailingNewline = true;
        if (this.statementLine !== -1) {
          if (this.statementLine === 0) {
            this.indent(2); // Begin multiple-line statement. Increase the indentation level.
          }
          this.statementLine++;
        }
      }

      first = false;
      if (line.length === 0) {
        return; // Don't indent empty lines.
      }

      // Emit indentation and comment prefix if necessary.
      if (this.trailingNewline) {
        this.emitIndentation();
        if (this.javaDoc) {
          this.out.append(" * ")
        } else if (this.comment) {
          this.out.append("// ");
        }
      }

      this.out.append(line);
      this.trailingNewline = false;
    });

    return this;
  }

  private emitIndentation(): void {
    for (let j = 0; j < this.indentLevel; j++) {
      this.out.append(this.indentString);
    }
  }

  /**
   * Returns the symbols that are required to be imported for this code. If there were any simple name
   * collisions, that symbol's first use is imported; which may cause compilation issues.
   */
  public requiredImports(): Imported[] {
    const imported: Imported[] = [];
    this.referencedSymbols.forEach(sym => {
      if (sym instanceof Imported) {
        imported.push(sym);
      }
    });
    return imported;
  }
}
