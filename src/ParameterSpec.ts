import { imm, Imm } from 'ts-imm';
import { CodeBlock } from './CodeBlock';
import { CodeWriter } from './CodeWriter';
import { DecoratorSpec } from './DecoratorSpec';
import { Modifier } from './Modifier';
import { SymbolSpec } from './SymbolSpecs';
import { TypeName } from './TypeNames';

export class ParameterSpec extends Imm<ParameterSpec> {
  public static create(
    name: string,
    type: TypeName,
    optional: boolean = false,
    ...modifiers: Modifier[]
  ): ParameterSpec {
    // require(name.isName) { "not a valid name: $name" }
    return new ParameterSpec({
      name,
      type,
      optional,
      decorators: [],
      modifiers,
      defaultValueField: undefined,
    });
  }

  public static emitAll(
    parameters: ParameterSpec[],
    codeWriter: CodeWriter,
    enclosed: boolean,
    rest: ParameterSpec | undefined,
    emitFn: ((p: ParameterSpec, rest: boolean) => void) | undefined
  ): void {
    const emitFn2 = emitFn || ((p, r): void => p.emit(codeWriter, true, r));
    const params = parameters.concat(rest !== undefined ? [rest] : []);
    if (enclosed) {
      codeWriter.emit('(');
    }
    if (params.length <= 5) {
      let index = 0;
      params.forEach(parameter => {
        if (index > 0) {
          codeWriter.emit(', ');
        }
        emitFn2(parameter, rest === parameter);
        index++;
      });
    } else {
      codeWriter.emit('\n').indent(2);
      let index = 0;
      params.forEach(parameter => {
        if (index > 0) {
          codeWriter.emit(',\n');
        }
        emitFn2(parameter, rest === parameter);
        index++;
      });
      codeWriter.unindent(2).emit('\n');
    }
    if (enclosed) {
      codeWriter.emit(')');
    }
  }

  @imm
  public readonly name!: string;
  @imm
  public readonly type!: TypeName;
  @imm
  public readonly optional!: boolean;
  @imm
  public readonly decorators!: DecoratorSpec[];
  @imm
  public readonly modifiers!: Modifier[];
  @imm
  public readonly defaultValueField!: CodeBlock | undefined;

  public emit(codeWriter: CodeWriter, includeType: boolean = true, isRest: boolean = false): void {
    codeWriter.emitDecorators(this.decorators, true);
    codeWriter.emitModifiers(this.modifiers);
    if (isRest) {
      codeWriter.emitCode('...');
    }
    codeWriter.emitCode('%L', this.name);
    if (this.optional) {
      codeWriter.emitCode('?');
    }
    if (includeType) {
      codeWriter.emitCode(': %T', this.type);
    }
    this.emitDefaultValue(codeWriter);
  }

  public emitDefaultValue(codeWriter: CodeWriter): void {
    if (this.defaultValueField) {
      codeWriter.emitCode(' = %[%L%]', this.defaultValueField);
    }
  }

  public addDecorators(...decoratorSpecs: DecoratorSpec[]): this {
    return this.copy({
      decorators: [...this.decorators, ...decoratorSpecs],
    });
  }

  public addDecorator(decoratorSpec: DecoratorSpec | SymbolSpec | string): this {
    const decorator = DecoratorSpec.fromMaybeString(decoratorSpec);
    return this.copy({
      decorators: [...this.decorators, decorator],
    });
  }

  public addModifiers(...modifiers: Modifier[]): this {
    return this.copy({
      modifiers: [...this.modifiers, ...modifiers],
    });
  }

  public defaultValue(format: string, ...args: any[]): this {
    return this.defaultValueBlock(CodeBlock.of(format, ...args));
  }

  public defaultValueBlock(codeBlock?: CodeBlock): this {
    // check(this.defValue === null, "initializer was already set");
    return this.copy({
      defaultValueField: codeBlock,
    });
  }

  public toString(): string {
    return CodeWriter.emitToString(this);
  }
}
