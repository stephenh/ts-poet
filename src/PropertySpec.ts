import { imm, Imm } from 'ts-imm';
import { CodeBlock } from './CodeBlock';
import { CodeWriter } from './CodeWriter';
import { DecoratorSpec } from './DecoratorSpec';
import { Modifier } from './Modifier';
import { TypeName } from './TypeNames';

/** A generated property declaration. */
export class PropertySpec extends Imm<PropertySpec> {
  public static create(
    name: string,
    type: TypeName,
    optional: boolean = false,
    ...modifiers: Modifier[]
  ): PropertySpec {
    return new PropertySpec({
      name,
      type,
      javaDoc: CodeBlock.empty(),
      decorators: [],
      modifiers,
      initializerField: undefined,
      optional,
      implicitlyType: false,
    });
  }

  @imm
  public readonly name!: string;
  @imm
  public readonly type!: TypeName;
  @imm
  public readonly javaDoc!: CodeBlock;
  @imm
  public readonly decorators!: DecoratorSpec[];
  @imm
  public readonly modifiers!: Modifier[];
  @imm
  public readonly initializerField?: CodeBlock;
  @imm
  public readonly optional!: boolean;
  @imm
  public readonly implicitlyType!: boolean;

  public emit(
    codeWriter: CodeWriter,
    implicitModifiers: Modifier[] = [],
    asStatement: boolean = false,
    withInitializer: boolean = true
  ) {
    codeWriter.emitJavaDoc(this.javaDoc);
    codeWriter.emitDecorators(this.decorators, false);
    codeWriter.emitModifiers(this.modifiers, implicitModifiers);
    codeWriter.emitCode(this.name);
    if (this.optional) {
      codeWriter.emitCode('?');
    }
    if (!this.implicitlyType) {
      codeWriter.emitCode(`: %T`, this.type);
    }
    if (withInitializer && this.initializerField) {
      codeWriter.emit(' = ');
      codeWriter.emitCodeBlock(this.initializerField);
    }
    if (asStatement) {
      codeWriter.emit(';\n');
    }
  }

  public addJavadoc(format: string, ...args: any[]): this {
    return this.copy({
      javaDoc: this.javaDoc.add(format, ...args),
    });
  }

  public addJavadocBlock(block: CodeBlock): this {
    return this.copy({
      javaDoc: this.javaDoc.addCode(block),
    });
  }

  public addDecorators(...decoratorSpecs: DecoratorSpec[]): this {
    return this.copy({
      decorators: [...this.decorators, ...decoratorSpecs],
    });
  }

  public addDecorator(decoratorSpec: DecoratorSpec): this {
    return this.copy({
      decorators: [...this.decorators, decoratorSpec],
    });
  }

  public addModifiers(...modifiers: Modifier[]): this {
    return this.copy({
      modifiers: [...this.modifiers, ...modifiers],
    });
  }

  public setImplicitlyTyped(): this {
    return this.copy({ implicitlyType: true });
  }

  public initializer(format: string, ...args: any[]): this {
    return this.initializerBlock(CodeBlock.of(format, ...args));
  }

  public initializerBlock(codeBlock: CodeBlock): this {
    return this.copy({
      initializerField: codeBlock,
    });
  }

  public toString(): string {
    return CodeWriter.emitToString(this);
  }
}
