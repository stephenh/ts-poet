import { CodeBlock } from "./CodeBlock";
import { CodeWriter } from "./CodeWriter";
import { DecoratorSpec } from "./DecoratorSpec";
import { Modifier } from "./Modifier";
import { SymbolSpec } from "./SymbolSpecs";
import { TypeName } from "./TypeNames";

export class ParameterSpec {

  public static builder(name: string, type: TypeName, optional: boolean = false, ...modifiers: Modifier[]): ParameterSpecBuilder {
    // require(name.isName) { "not a valid name: $name" }
    return new ParameterSpecBuilder(name, type, optional).addModifiers(...modifiers);
  }

  public static emitAll(
    parameters: ParameterSpec[],
    codeWriter: CodeWriter,
    enclosed: boolean,
    rest: ParameterSpec | undefined,
    emitFn: ((p: ParameterSpec, rest: boolean) => void) | undefined): void {
      const emitFn2 = emitFn || ((p, r) => p.emit(codeWriter, true, r));
      const params = parameters.concat(rest !== undefined ? [rest] : []);
      if (enclosed) {
        codeWriter.emit("(");
      }
      if (params.length <= 5) {
        let index = 0;
        params.forEach(parameter => {
          if (index > 0) {
            codeWriter.emit(", ");
          }
          emitFn2(parameter, rest === parameter);
          index++;
        });
      } else {
        codeWriter.emit("\n").indent(2);
        let index = 0;
        params.forEach(parameter => {
          if (index > 0) {
            codeWriter.emit(",\n");
          }
          emitFn2(parameter, rest === parameter);
          index++;
        });
        codeWriter.unindent(2).emit("\n");
      }
      if (enclosed) {
        codeWriter.emit(")");
      }
    }

  public readonly name: string;
  public readonly optional: boolean;
  public readonly decorators: DecoratorSpec[];
  public readonly modifiers: Modifier[];
  public readonly type: TypeName;
  public readonly defaultValue: CodeBlock | undefined;

 constructor(builder: ParameterSpecBuilder) {
   this.name = builder.name;
   this.optional = builder.optional;
   this.decorators = builder.decorators;
   this.modifiers = builder.modifiers;
   this.type = builder.type;
   this.defaultValue = builder.defaultValueField;
 }

   public emit(
     codeWriter: CodeWriter,
     includeType: boolean = true,
     isRest: boolean = false) {
     codeWriter.emitDecorators(this.decorators, true);
     codeWriter.emitModifiers(this.modifiers);
     if (isRest) {
       codeWriter.emitCode("... ");
     }
     codeWriter.emitCode("%L", this.name);
     if (this.optional) {
       codeWriter.emitCode("?");
     }
     if (includeType) {;
       codeWriter.emitCode(": %T", this.type);
     }
     this.emitDefaultValue(codeWriter);
   }

   public emitDefaultValue(codeWriter: CodeWriter) {
     if (this.defaultValue) {
       codeWriter.emitCode(" = %[%L%]", this.defaultValue);
     }
   }


   public toBuilder(name: string = this.name, type: TypeName = this.type): ParameterSpecBuilder {
     const builder = new ParameterSpecBuilder(name, type, this.optional);
     builder.decorators.push(...this.decorators);
     builder.modifiers.push(...this.modifiers);
     builder.defaultValueField = this.defaultValue;
     return builder;
   }
 }

export class ParameterSpecBuilder {
  public readonly decorators: DecoratorSpec[] = [];
  public readonly modifiers: Modifier[] = [];
  public defaultValueField?: CodeBlock;

   constructor(
     public name: string,
     public type: TypeName,
     public optional: boolean = false,
  ) {}

  public addDecorators(...decoratorSpecs: DecoratorSpec[]): this {
    this.decorators.push(...decoratorSpecs);
    return this;
  }

  public addDecorator(decoratorSpec: DecoratorSpec | SymbolSpec): this {
    this.decorators.push(
      decoratorSpec instanceof SymbolSpec
        ? DecoratorSpec.builder(decoratorSpec).build()
        : decoratorSpec);
    return this;
  }

  public addModifiers(...modifiers: Modifier[]): this {
    this.modifiers.push(...modifiers);
    return this;
  }

  public defaultValue(format: string, ...args: any[]): this {
     return this.defaultValueBlock(CodeBlock.of(format, ...args));
  }

  public defaultValueBlock(codeBlock?: CodeBlock): this {
    // check(this.defValue === null, "initializer was already set");
    this.defaultValueField = codeBlock;
    return this;
  }

  public build(): ParameterSpec {
    return new ParameterSpec(this);
  }
}

