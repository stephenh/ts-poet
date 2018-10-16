import { CodeBlock } from "./CodeBlock";
import { CodeWriter } from "./CodeWriter";
import { SymbolSpec } from "./SymbolSpecs";

/** A generated function or class decorator declaration. */
export class DecoratorSpec {

  public static builder(name: string | SymbolSpec): DecoratorSpecBuilder {
    return new DecoratorSpecBuilder(SymbolSpec.fromMaybeString(name));
  }

  private readonly name: SymbolSpec;
  private readonly parameters: Array<[string | undefined, CodeBlock]> = [];
  private readonly factory: boolean;

  constructor(builder: DecoratorSpecBuilder) {
    this.name = builder.name;
    this.parameters.push(...builder.parameters);
    this.factory = builder.factory || false;
  }

  public emit(codeWriter: CodeWriter, inline: boolean, asParameter: boolean = false) {
    codeWriter.emitCode("@%N", this.name);

    if (this.parameters.length > 0) {
      codeWriter.emit("(");
      if (!inline) {
        codeWriter.indent();
        codeWriter.emit("\n");
      }

      let index = 0;
      this.parameters.forEach( ([first, second]) => {
        if (index > 0 && index < this.parameters.length) {
          codeWriter.emit(",")
          codeWriter.emit(inline ? " " : "\n");
        }
        if (!asParameter && first !== undefined) {
          codeWriter.emit(`/* ${first} */ `)
        }
        codeWriter.emitCodeBlock(second);
        index++;
      });

      if (!inline) {
        codeWriter.unindent();
        codeWriter.emit("\n");
      }
      codeWriter.emit(")");
    } else if (this.factory) {
      codeWriter.emit("()");
    }
  }

  public toBuilder(): DecoratorSpecBuilder {
    const builder = new DecoratorSpecBuilder(this.name);
    builder.parameters.push(...this.parameters);
    builder.factory = this.factory;
    return builder;
  }

}

export class DecoratorSpecBuilder {

  public readonly parameters: Array<[string | undefined, CodeBlock]> = [];
  public factory?: boolean;

  constructor(public name: SymbolSpec) {}

  public asFactory(): this {
    this.factory = true;
    return this;
  }

  public addParameter(name: string | undefined, format: string, ...args: any[]): this {
    this.parameters.push([name, CodeBlock.of(format, args)]);
    return this;
  }

  public addParameterBlock(name: string | undefined, codeBlock: CodeBlock): this {
    this.parameters.push([name, codeBlock]);
    return this;
  }

  public build(): DecoratorSpec {
    return new DecoratorSpec(this);
  }
}


