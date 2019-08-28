import { imm, Imm } from 'ts-imm';
import { CodeBlock } from './CodeBlock';
import { CodeWriter } from './CodeWriter';
import { Modifier } from './Modifier';
import { TypeName, TypeVariable } from './TypeNames';

/** A generated typealias declaration */
export class TypeAliasSpec extends Imm<TypeAliasSpec> {
  public static create(name: string, type: TypeName): TypeAliasSpec {
    return new TypeAliasSpec({
      name,
      type,
      javaDoc: CodeBlock.empty(),
      modifiers: [],
      typeVariables: [],
    });
  }

  @imm
  public readonly name!: string;
  @imm
  public readonly type!: TypeName;
  @imm
  public readonly javaDoc!: CodeBlock;
  @imm
  public readonly modifiers!: Modifier[];
  @imm
  public readonly typeVariables!: TypeVariable[];

  public emit(codeWriter: CodeWriter): void {
    codeWriter.emitJavaDoc(this.javaDoc);
    codeWriter.emitModifiers(this.modifiers);
    codeWriter.emitCode('type %L', this.name);
    codeWriter.emitTypeVariables(this.typeVariables);
    codeWriter.emitCode(' = %T', this.type);
    codeWriter.emit(';\n');
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
    // eslint-disable-next-line
    let curr = this;
    modifiers.forEach(it => {
      curr = curr.addModifier(it);
    });
    return curr;
  }

  public addModifier(modifier: Modifier): this {
    // require(modifier in setOf(Modifier.EXPORT)) { "unexpected typealias modifier $modifier"
    return this.copy({
      modifiers: [...this.modifiers, modifier],
    });
  }

  public addTypeVariables(...typeVariables: TypeVariable[]): this {
    return this.copy({
      typeVariables: [...this.typeVariables, ...typeVariables],
    });
  }

  public addTypeVariable(typeVariable: TypeVariable): this {
    return this.copy({
      typeVariables: [...this.typeVariables, typeVariable],
    });
  }

  public toString(): string {
    return CodeWriter.emitToString(this);
  }
}
