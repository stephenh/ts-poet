import _ from 'lodash';
import * as Path from 'path';
import { ClassSpec } from './ClassSpec';
import { CodeBlock } from './CodeBlock';
import { DecoratorSpec } from './DecoratorSpec';
import { EnumSpec } from './EnumSpec';
import { FunctionSpec } from './FunctionSpec';
import { InterfaceSpec } from './InterfaceSpec';
import { LineWrapper } from './LineWrapper';
import { Modifier, ModifierOrder } from './Modifier';
import { StringBuffer } from './StringBuffer';
import { SymbolReferenceTracker } from './SymbolReferenceTracker';
import { Augmented, Imported, ImportsAll, ImportsDefault, ImportsName, SideEffect, SymbolSpec } from './SymbolSpecs';
import { TypeName, TypeVariable } from './TypeNames';
import { check, filterInstances, stringLiteralWithQuotes, unique } from './utils';

/**
 * Converts a [FileSpec] to a string suitable to both human- and tsc-consumption. This honors
 * imports, indentation, and deferred variable names.
 */
export class CodeWriter implements SymbolReferenceTracker {
  public static emitToString(emittable: { emit(cw: CodeWriter): void }): string {
    const out = new StringBuffer();
    emittable.emit(new CodeWriter(out));
    return out.toString();
  }

  private readonly out: LineWrapper;
  private readonly referencedSymbols: Set<SymbolSpec> = new Set();
  private indentLevel = 0;
  private javaDoc = false;
  private comment = false;
  private trailingNewline = false;

  constructor(out: StringBuffer, private indentString: string = '  ', referencedSymbols: Set<SymbolSpec> = new Set()) {
    this.out = new LineWrapper(out, indentString, 100);
    referencedSymbols.forEach(sym => this.referencedSymbols.add(sym));
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
    this.comment = true;
    try {
      this.emitCodeBlock(codeBlock);
      this.emit('\n');
    } finally {
      this.comment = false;
    }
  }

  public emitJavaDoc(javaDocCodeBlock: CodeBlock): void {
    if (javaDocCodeBlock.isEmpty()) {
      return;
    }
    this.emit('/**\n');
    this.javaDoc = true;
    try {
      this.emitCodeBlock(javaDocCodeBlock);
    } finally {
      this.javaDoc = false;
    }
    this.emit(' */\n');
  }

  public emitDecorators(decorators: DecoratorSpec[], inline: boolean): void {
    decorators.forEach(decoratorSpec => {
      decoratorSpec.emit(this, inline);
      this.emit(inline ? ' ' : '\n');
    });
  }

  /**
   * Emits `modifiers` in the standard order. Modifiers in `implicitModifiers` will not
   * be emitted.
   */
  public emitModifiers(modifiers: Modifier[], implicitModifiers: Modifier[] = []): void {
    if (modifiers.length === 0) {
      return;
    }
    ModifierOrder.forEach(m => {
      if (modifiers.includes(m) && !implicitModifiers.includes(m)) {
        this.emit(m).emit(' ');
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
    this.emit('<');
    let index = 0;
    typeVariables.forEach(typeVariable => {
      if (index > 0) {
        this.emit(', ');
      }
      let code = typeVariable.name;
      if (typeVariable.bounds.length > 0) {
        const parts: string[] = [];
        parts.push(' extends');
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
        code += parts.join(' ');
      }
      this.emit(code);
      index++;
    });
    this.emit('>');
  }

  public emitImports(path: string): this {
    const imports = this.requiredImports();
    const augmentImports = _.groupBy(filterInstances(imports, Augmented), a => a.augmented);
    const sideEffectImports = _.groupBy(filterInstances(imports, SideEffect), a => a.source);

    if (imports.length > 0) {
      const m = _.groupBy(
        imports.filter(it => !(it instanceof Augmented) || !(it instanceof SideEffect)),
        it => it.source
      ); // FileModules.importPath(this.path, it.source));
      // .toSortedMap()
      // tslint:disable-next-line:no-shadowed-variable
      Object.entries(m).forEach(([sourceImportPath, imports]) => {
        // Skip imports from the current module
        if (path === sourceImportPath || Path.resolve(path) === Path.resolve(sourceImportPath)) {
          return;
        }
        // Output star imports individually
        filterInstances(imports, ImportsAll).forEach(i => {
          this.emitCode("%[import * as %L from '%L';\n%]", i.value, sourceImportPath);
          const augments = augmentImports[i.value];
          if (augments) {
            augments.forEach(augment => this.emitCode("%[import '%L';\n%]", augment.source));
          }
        });
        // Output named imports as a group
        const names = unique(filterInstances(imports, ImportsName).map(it => it.value));
        const def = unique(filterInstances(imports, ImportsDefault).map(it => it.value));
        if (names.length > 0 || def.length > 0) {
          const namesPart = names.length > 0 ? [`{ ${names.join(', ')} }`] : [];
          const defPart = def.length > 0 ? [def[0]] : [];
          this.emitCode('import ')
            .emitCode([...defPart, ...namesPart].join(', '))
            .emitCode(" from '%L';\n", sourceImportPath);
          [...names, ...def].forEach(name => {
            const augments = augmentImports[name];
            if (augments) {
              augments.forEach(augment => this.emitCode("%[import '%L';\n%]", augment.source));
            }
          });
        }
      });

      Object.keys(sideEffectImports).forEach(it => {
        this.emitCode('%[import %S;\n%]', it);
      });

      this.emit('\n');
    }
    return this;
  }

  /* TODO
  public emitCode(s: string): void {
    this.emitCodeBlock(CodeBlock.of(s));
  }
  */

  public emitCode(format: string, ...args: unknown[]): this {
    this.emitCodeBlock(CodeBlock.of(format, ...args));
    return this;
  }

  public emitCodeBlock(codeBlock: CodeBlock): this {
    // Transfer all symbols referenced in the code block
    codeBlock.referencedSymbols.forEach(sym => this.referencedSymbols.add(sym));
    let a = 0;
    codeBlock.formatParts.forEach(part => {
      switch (part) {
        case '%L':
          this.emitLiteral(codeBlock.args[a++]);
          break;
        case '%N':
          this.emit(codeBlock.args[a++] as string);
          break;
        case '%S':
          this.emitString(codeBlock.args[a++] as string);
          break;
        case '%T':
          this.emitTypeName(codeBlock.args[a++] as TypeName);
          break;
        case '%%':
          this.emit('%');
          break;
        case '%>':
          this.indent();
          break;
        case '%<':
          this.unindent();
          break;
        case '%[':
          break;
        case '%]':
          break;
        case '%W':
          this.emitWrappingSpace();
          break;
        case '%F':
          this.emitFunction(codeBlock.args[a++] as FunctionSpec);
          break;
        // Handle deferred type.
        default:
          this.emit(part);
      }
    });
    if (codeBlock.trailer) {
      this.emitCodeBlock(codeBlock.trailer);
    }
    return this;
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
          this.out.append(this.javaDoc ? ' *' : '//');
        }
        this.out.append('\n');
        this.trailingNewline = true;
      }

      first = false;
      if (line.length === 0) {
        return; // Don't indent empty lines.
      }

      // Emit indentation and comment prefix if necessary.
      if (this.trailingNewline) {
        this.emitIndentation();
        if (this.javaDoc) {
          this.out.append(' * ');
        } else if (this.comment) {
          this.out.append('// ');
        }
      }

      this.out.append(line);
      this.trailingNewline = false;
    });

    return this;
  }

  public newLine(): this {
    return this.emit('\n');
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

  private emitIndentation(): void {
    for (let j = 0; j < this.indentLevel; j++) {
      this.out.append(this.indentString);
    }
  }

  private emitWrappingSpace(): this {
    this.out.wrappingSpace(this.indentLevel + 2);
    return this;
  }

  private emitTypeName(typeName: TypeName): void {
    this.emit(typeName.reference(this));
  }

  private emitFunction(fn: FunctionSpec): void {
    fn.emit(this);
  }

  private emitString(s?: string): void {
    if (s === null) {
      // Emit null as a literal null: no quotes.
      this.emit('null');
    } else if (s === undefined) {
      this.emit('undefined');
    } else {
      this.emit(stringLiteralWithQuotes(s));
    }
  }

  private emitLiteral(o?: unknown): void {
    if (o instanceof ClassSpec) {
      return o.emit(this);
    } else if (o instanceof InterfaceSpec) {
      return o.emit(this);
    } else if (o instanceof EnumSpec) {
      return o.emit(this);
    } else if (o instanceof DecoratorSpec) {
      return o.emit(this, true, true);
    } else if (o instanceof CodeBlock) {
      this.emitCodeBlock(o);
    } else if (typeof o === 'object' && o) {
      this.emit(o.toString());
    } else {
      this.emit(String(o));
    }
  }
}
