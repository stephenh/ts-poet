import { imm, Imm } from 'ts-imm';
import { CodeBlock } from './CodeBlock';
import { CodeWriter } from './CodeWriter';
import { Modifier } from './Modifier';
import { check } from './utils';

export class EnumSpec extends Imm<EnumSpec> {
  public static create(name: string): EnumSpec {
    return new EnumSpec({
      name,
      javaDoc: CodeBlock.empty(),
      modifiers: [],
      constants: new Map(),
    });
  }

  @imm
  public readonly name!: string;
  @imm
  public readonly javaDoc!: CodeBlock;
  @imm
  public readonly modifiers!: Modifier[];
  @imm
  public readonly constants!: Map<string, CodeBlock | undefined>;

  public emit(codeWriter: CodeWriter): void {
    codeWriter.emitJavaDoc(this.javaDoc);
    codeWriter.emitModifiers(this.modifiers);
    codeWriter.emitCode('enum %L {\n', this.name);
    codeWriter.indent();
    let left = this.constants.size;
    this.constants.forEach((value, key) => {
      codeWriter.emitCode('%L', key);
      if (value) {
        codeWriter.emitCode(' = ');
        codeWriter.emitCodeBlock(value);
      }
      if (left-- > 0) {
        codeWriter.emit(',\n');
      } else {
        codeWriter.emit('\n');
      }
    });
    codeWriter.unindent();
    codeWriter.emit('}\n');
  }

  public addJavadoc(format: string, ...args: unknown[]): this {
    return this.copy({
      javaDoc: this.javaDoc.add(format, ...args),
    });
  }

  public addJavadocBlock(block: CodeBlock): this {
    return this.copy({
      javaDoc: this.javaDoc.addCode(block),
    });
  }

  public addModifiers(...modifiers: Modifier[]): this {
    modifiers.forEach(it => check(it === Modifier.EXPORT || it === Modifier.DECLARE));
    modifiers.forEach(m => this.modifiers.push(m));
    return this;
  }

  public addConstant(name: string, initializer?: string | CodeBlock): this {
    // require(name.isName) { "not a valid enum constant: $name" }
    this.constants.set(name, typeof initializer === 'string' ? CodeBlock.of(initializer) : initializer);
    return this;
  }

  public toString(): string {
    return CodeWriter.emitToString(this);
  }

  private hasNoBody(): boolean {
    return this.constants.size === 0;
  }
}
