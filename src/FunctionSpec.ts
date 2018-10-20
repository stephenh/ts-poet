/** A generated function declaration. */
import { CodeBlock, Dictionary } from "./CodeBlock";
import { CodeWriter } from "./CodeWriter";
import { DecoratorSpec } from "./DecoratorSpec";
import { Modifier } from "./Modifier";
import { ParameterSpec } from "./ParameterSpec";
import { TypeName, TypeNames, TypeVariable } from "./TypeNames";

const CONSTRUCTOR = "constructor()";
const CALLABLE = "callable()";
const INDEXABLE = "indexable()";

export class FunctionSpec {

  public static builder(name: string) {
    return new FunctionSpecBuilder(name);
  }

  public static constructorBuilder() {
    return new FunctionSpecBuilder(CONSTRUCTOR);
  }

  public static callableBuilder() {
    return new FunctionSpecBuilder(CALLABLE);
  }

  public static indexableBuilder() {
    return new FunctionSpecBuilder(INDEXABLE);
  }

  public readonly name: string;
  public readonly javaDoc: CodeBlock;
  public readonly decorators: DecoratorSpec[] = [];
  public readonly modifiers: Modifier[] = [];
  public readonly typeVariables: TypeVariable[] = [];
  public readonly returnType?: TypeName;
  public readonly parameters: ParameterSpec[] = [];
  public readonly restParameter: ParameterSpec | undefined;
  public readonly body: CodeBlock;

  public constructor(builder: FunctionSpecBuilder) {
    this.name = builder.name;
    this.javaDoc = builder.javaDoc;
    this.decorators.push(...builder.decorators);
    this.modifiers.push(...builder.modifiers);
    this.typeVariables.push(...builder.typeVariables);
    this.returnType = builder.returnType;
    this.parameters.push(...builder.parameters);
    this.restParameter = builder.restParameter;
    this.body = builder.body;
  }

  /*
  init {
    require(body.isEmpty() || Modifier.ABSTRACT !in builder.modifiers) {
      "abstract function ${builder.name} cannot have code"
    }
  }
  */

  public abstract(): FunctionSpec {
    return FunctionSpec.builder(this.name)
      .addModifiers(Modifier.ABSTRACT)
      .addTypeVariables(...this.typeVariables)
      .addParameters(...this.parameters)
      .build();
  }

  public parameter(name: string): ParameterSpec | undefined {
    return this.parameters.find(it => it.name === name);
  }

  public emit(codeWriter: CodeWriter, enclosingName?: string, implicitModifiers: Modifier[] = []): void {
    codeWriter.emitJavaDoc(this.javaDoc);
    codeWriter.emitDecorators(this.decorators, false);
    codeWriter.emitModifiers(this.modifiers, implicitModifiers);

    this.emitSignature(codeWriter, enclosingName);

    const isEmptyConstructor = this.isConstructor && this.body.isEmpty();
    if (this.modifiers.indexOf(Modifier.ABSTRACT) > -1 || isEmptyConstructor) {
      codeWriter.emit(";\n");
      return
    }

    codeWriter.emit(" {\n");
    codeWriter.indent();
    codeWriter.emitCodeBlock(this.body);
    codeWriter.unindent();
    codeWriter.emit("}\n");
  }

  public toBuilder(): FunctionSpecBuilder {
    const builder = new FunctionSpecBuilder(this.name);
    // builder.javaDoc.add(javaDoc)
    // builder.decorators += decorators
    // builder.modifiers += modifiers
    // builder.typeVariables += typeVariables
    // builder.returnType = returnType
    // builder.parameters += parameters
    // builder.body.add(body)
    return builder;
  }

  private emitSignature(codeWriter: CodeWriter, enclosingName?: string) {
    if (this.isConstructor) {
      codeWriter.emitCode("constructor");
    } else if (this.isCallable) {
      codeWriter.emitCode("");
    } else if (this.isIndexable) {
      codeWriter.emitCode("[");
    } else {
      if (enclosingName === undefined) {
        codeWriter.emit("function ");
      }
      codeWriter.emitCode("%L", this.name);
    }
    if (this.typeVariables.length > 0) {
      codeWriter.emitTypeVariables(this.typeVariables);
    }
    ParameterSpec.emitAll(
      this.parameters,
      codeWriter,
      !this.isIndexable,
      this.restParameter,
      undefined);
    if (this.isIndexable) {
      codeWriter.emitCode("]")
    }
    if (this.returnType !== undefined && this.returnType !== TypeNames.VOID) {
      codeWriter.emitCode(": %T", this.returnType);
    }
  }

  get isConstructor(): boolean {
    return this.name === CONSTRUCTOR;
  }

  get isAccessor(): boolean {
    return this.modifiers.indexOf(Modifier.GET) > -1 || this.modifiers.indexOf(Modifier.SET) > -1;
  }

  get isCallable(): boolean {
    return this.name === CALLABLE;
  }

  get isIndexable(): boolean {
    return this.name === INDEXABLE;
  }
}

export class FunctionSpecBuilder {

  public javaDoc: CodeBlock = CodeBlock.empty();
  public decorators: DecoratorSpec[] = [];
  public modifiers: Modifier[] = [];
  public typeVariables: TypeVariable[] = [];
  public returnType: TypeName | undefined = undefined;
  public parameters: ParameterSpec[] = [];
  public restParameter: ParameterSpec | undefined;
  public body: CodeBlock = CodeBlock.empty();

  constructor(public name: string) {}

    // init {
    //   require(name.isConstructor || name.isName) { "not a valid name: $name" }
    // }

  public addJavadoc(format: string, ...args: any[]): this {
    this.javaDoc = this.javaDoc.add(format, ...args);
    return this;
  }

  public addJavadocBlock(block: CodeBlock): this {
    this.javaDoc = this.javaDoc.addCode(block);
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

  public addTypeVariables(...typeVariables: TypeVariable[]): this {
    this.typeVariables.push(...typeVariables);
    return this;
  }

  public addTypeVariable(typeVariable: TypeVariable): this {
    this.typeVariables.push(typeVariable);
    return this;
  }

  public returns(returnType: TypeName): this {
    // check(!name.isConstructor) { "$name cannot have a return type" }
    this.returnType = returnType;
    return this;
  }

  public addParameters(...parameterSpecs: ParameterSpec[]): this {
    this.parameters.push(...parameterSpecs);
    return this;
  }

  public addParameter(name: string, type: TypeName, optional?: boolean, modifiers?: Modifier[], initializer?: CodeBlock): this
  public addParameter(parameterSpec: ParameterSpec): this
  public addParameter(parameterSpec: ParameterSpec | string): this {
    if (typeof parameterSpec === 'string') {
      const name = parameterSpec;
      const type: TypeName = arguments[1] || TypeNames.ANY;
      const optional: boolean = arguments[2] || false;
      const modifiers: Modifier[] = arguments[3] || [];
      const initializer: CodeBlock | undefined = arguments[4];
      this.parameters.push(ParameterSpec.create(name, type, optional, ...modifiers).defaultValueBlock(initializer));
    } else {
      this.parameters.push(parameterSpec);
    }
    return this;
  }

  /*
  public addParameter(name: String, type: TypeName, optional: Boolean = false, defaultValue: CodeBlock, vararg modifiers: Modifier)
     = addParameter(ParameterSpec.builder(name, type, optional,
                                                                              *modifiers).defaultValue(defaultValue).build())

  public addParameter(name: String, type: TypeName, optional: Boolean = false, vararg modifiers: Modifier)
     = addParameter(ParameterSpec.builder(name, type, optional, *modifiers).build())
     */

  public rest(name: string, type: TypeName): this
  public rest(parameterSpec: ParameterSpec): this
  public rest(parameterSpec: ParameterSpec | string): this {
    if (typeof parameterSpec === 'string') {
      const name = parameterSpec;
      const type: TypeName = arguments[1] || TypeNames.ANY;
      this.restParameter = ParameterSpec.create(name, type);
    } else {
      this.restParameter = parameterSpec;
    }
    return this;
  }

  public addCode(format: string, ...args: any[]): this {
    // modifiers -= Modifier.ABSTRACT
    this.body = this.body.add(format, ...args);
    return this;
  }

  public addNamedCode(format: string, args: Dictionary<any>): this {
    // modifiers -= Modifier.ABSTRACT
    this.body = this.body.addNamed(format, args);
    return this;
  }

  public addCodeBlock(codeBlock: CodeBlock): this {
    // modifiers -= Modifier.ABSTRACT
    this.body = this.body.addCode(codeBlock);
    return this;
  }

  public addComment(format: string, ...args: any[]): this {
    this.body = this.body.add("// " + format + "\n", ...args);
    return this;
  }

  /**
   * @param controlFlow the control flow construct and its code, such as "if (foo == 5)".
   * * Shouldn't contain braces or newline characters.
   */
  public beginControlFlow(controlFlow: string, ...args: any[]): this {
    // modifiers -= Modifier.ABSTRACT
    this.body = this.body.beginControlFlow(controlFlow, ...args);
    return this;
  }

  /**
   * @param controlFlow the control flow construct and its code, such as "else if (foo == 10)".
   * *     Shouldn't contain braces or newline characters.
   */
  public nextControlFlow(controlFlow: string, ...args: any[]): this {
    // modifiers -= Modifier.ABSTRACT
    this.body = this.body.nextControlFlow(controlFlow, ...args);
    return this;
  }

  public endControlFlow(): this {
    // modifiers -= Modifier.ABSTRACT
    this.body = this.body.endControlFlow();
    return this;
  }

  public addStatement(format: string, ...args: any[]): this {
    // modifiers -= Modifier.ABSTRACT
    this.body = this.body.addStatement(format, ...args);
    return this;
  }

  public build(): FunctionSpec {
    return new FunctionSpec(this);
  }
}
