import { imm, Imm } from 'ts-imm';
import { CodeBlock } from './CodeBlock';
import { CodeWriter } from './CodeWriter';
import { SymbolSpec } from './SymbolSpecs';

/** A generated function or class decorator declaration. */
export class DecoratorSpec extends Imm<DecoratorSpec> {
  public static create(name: string | SymbolSpec): DecoratorSpec {
    return new DecoratorSpec({
      name: SymbolSpec.fromMaybeString(name),
      parameters: [],
      factory: false,
    });
  }

  public static fromMaybeString(
    decorator: DecoratorSpec | string | SymbolSpec,
    data?: Partial<DecoratorSpec>
  ): DecoratorSpec {
    return (typeof decorator === 'string' || decorator instanceof SymbolSpec
      ? DecoratorSpec.create(decorator)
      : decorator
    ).copy(data || {});
  }

  @imm
  public readonly name!: SymbolSpec;
  @imm
  public readonly parameters!: Array<[string | undefined, CodeBlock]>;
  @imm
  public readonly factory!: boolean;

  public emit(codeWriter: CodeWriter, inline: boolean = false, asParameter: boolean = false): void {
    codeWriter.emitCode('@%N', this.name);

    if (this.parameters.length > 0) {
      codeWriter.emit('(');
      if (!inline) {
        codeWriter.indent();
        codeWriter.emit('\n');
      }

      let index = 0;
      this.parameters.forEach(([first, second]) => {
        if (index > 0 && index < this.parameters.length) {
          codeWriter.emit(',');
          codeWriter.emit(inline ? ' ' : '\n');
        }
        if (!asParameter && first !== undefined) {
          codeWriter.emit(`/* ${first} */ `);
        }
        codeWriter.emitCodeBlock(second);
        index++;
      });

      if (!inline) {
        codeWriter.unindent();
        codeWriter.emit('\n');
      }
      codeWriter.emit(')');
    } else if (this.factory) {
      codeWriter.emit('()');
    }
  }

  public asFactory(): this {
    return this.copy({
      factory: true,
    });
  }

  public addParameter(name: string | undefined, format: string, ...args: unknown[]): this {
    return this.copy({
      parameters: [...this.parameters, [name, CodeBlock.of(format, args)]],
    });
  }

  public addParameterBlock(name: string | undefined, codeBlock: CodeBlock): this {
    return this.copy({
      parameters: [...this.parameters, [name, codeBlock]],
    });
  }

  public toString(): string {
    return CodeWriter.emitToString(this);
  }
}
