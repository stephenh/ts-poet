import { CodeWriter } from "./CodeWriter";
import { Modifier } from "./Modifier";
import { TypeName } from "./TypeNames";
import { CodeBlock } from "./CodeBlock";
import { DecoratorSpec } from "./DecoratorSpec";


/** A generated property declaration. */
export class PropertySpec {

  public static builder(name: string, type: TypeName, optional: boolean = false, ...modifiers: Modifier[]): PropertySpecBuilder {
    return new PropertySpecBuilder(name, type, optional).addModifiers(...modifiers);
  }

  public readonly name: string;
  public readonly type: TypeName;
  public readonly javaDoc: CodeBlock;
  public readonly decorators: DecoratorSpec[] = [];
  public readonly modifiers: Modifier[] = [];
  public readonly initializer?: CodeBlock;
  public readonly optional: boolean;

  constructor(builder: PropertySpecBuilder) {
    this.name = builder.name;
    this.type = builder.type;
    this.javaDoc = builder.javaDoc;
    this.decorators.push(...builder.decorators);
    this.modifiers.push(...builder.modifiers);
    this.initializer = builder.initializerField;
    this.optional = builder.optional;
  }

  public emit(
    codeWriter: CodeWriter,
    implicitModifiers: Modifier[],
    asStatement: boolean = false,
    withInitializer: boolean = true,
  ) {
    codeWriter.emitJavaDoc(this.javaDoc);
    codeWriter.emitDecorators(this.decorators, false);
    codeWriter.emitModifiers(this.modifiers, implicitModifiers);
    codeWriter.emitCode(`%L${this.optional ? "?" : ""}: %T`, this.name, this.type);
    if (withInitializer && this.initializer) {
      codeWriter.emit(" = ");
      codeWriter.emitCode("%[%L%]", this.initializer);
    }
    if (asStatement) {
      codeWriter.emit(";\n");
    }
  }

  public toBuilder(): PropertySpecBuilder {
    const bldr = new PropertySpecBuilder(this.name, this.type, this.optional)
       .addJavadocBlock(this.javaDoc)
       .addDecorators(...this.decorators)
       .addModifiers(...this.modifiers);
    if (this.initializer) {
      bldr.initializerBlock(this.initializer);
    }
    return bldr;
  }
}

class PropertySpecBuilder {

  constructor(
    public name: string,
    public type: TypeName,
    public optional: boolean = false) {
  }

  public javaDoc = CodeBlock.empty();
  public decorators: DecoratorSpec[] = [];
  public modifiers: Modifier[] = [];
  public initializerField?: CodeBlock;

  public addJavadoc(format: string, ...args: any[]): this {
    this.javaDoc.add(format, ...args);
    return this;
  }

  public addJavadocBlock(block: CodeBlock): this {
    this.javaDoc.addCode(block);
    return this;
  }

  public addDecorators(...decoratorSpecs: DecoratorSpec[]): this {
    this.decorators.push(...decoratorSpecs);
    return this;
  }

  public addDecorator(decoratorSpec: DecoratorSpec): this {
    this.decorators.push(decoratorSpec);
    return this;
  }

  public addModifiers(...modifiers: Modifier[]): this {
    this.modifiers.push(...modifiers);
    return this;
  }

  public initializer(format: string, ...args: any[]): this {
    return this.initializerBlock(CodeBlock.of(format, ...args));
  }

  public initializerBlock(codeBlock: CodeBlock): this {
    this.initializerField = codeBlock;
    return this;
  }

  public build(): PropertySpec {
    return new PropertySpec(this);
  }
}

