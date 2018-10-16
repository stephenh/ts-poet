import { CodeBlock } from "./CodeBlock";
import { CodeWriter } from "./CodeWriter";
import { Modifier } from "./Modifier";
import { TypeName, TypeVariable } from "./TypeNames";
import { FunctionSpec } from "./FunctionSpec";
import { PropertySpec } from "./PropertySpec";

/** A generated `interface` declaration. */
export class InterfaceSpec {

  public static builder(name: string): InterfaceSpecBuilder {
    return new InterfaceSpecBuilder(name);
  }

  /*
  public static builder(classSpec: ClassSpec): InterfaceSpecBuilder {
    const builder = new InterfaceSpecBuilder(classSpec.name)
      .addModifiers(...classSpec.modifiers)
      .addProperties(...classSpec.propertySpecs);
    classSpec.functionSpecs.forEach(it => builder.addFunction(it.abstract()));
    return builder;
  }
  */

  public readonly name: string;
  public readonly javaDoc: CodeBlock;
  public readonly modifiers: Modifier[] = [];
  public readonly typeVariables: TypeVariable[] = [];
  public readonly superInterfaces: TypeName[] = [];
  public readonly propertySpecs: PropertySpec[] = [];
  public readonly functionSpecs: FunctionSpec[] = [];
  public readonly indexableSpecs: FunctionSpec[] = [];
  public readonly callable?: FunctionSpec;

  constructor(builder: InterfaceSpecBuilder) {
    this.name = builder.name;
    this.javaDoc = builder.javaDoc.build();
    this.modifiers.push(...builder.modifiers);
    this.typeVariables.push(...builder.typeVariables);
    this.superInterfaces.push(...builder.superInterfaces);
    this.propertySpecs.push(...builder.propertySpecs);
    this.functionSpecs.push(...builder.functionSpecs);
    this.indexableSpecs.push(...builder.indexableSpecs);
    this.callable = builder.callableField;
  }

  public emit(codeWriter: CodeWriter): void {
    codeWriter.emitJavaDoc(this.javaDoc);
    codeWriter.emitModifiers(this.modifiers);
    codeWriter.emit("interface");
    codeWriter.emitCode(" %L", this.name);
    codeWriter.emitTypeVariables(this.typeVariables);

    const superClasses = this.superInterfaces.map(it => CodeBlock.of("%T", it));
    if (superClasses.length > 0) {
      codeWriter.emitCodeBlock(CodeBlock.joinToCode(superClasses, ", ", " extends "));
    }

    codeWriter.emit(" {\n");
    codeWriter.indent();

    // Callable
    if (this.callable) {
      codeWriter.emitCode("\n");
      this.callable.emit(codeWriter, undefined, [Modifier.ABSTRACT]);
    }

    // Properties.
    this.propertySpecs.forEach(propertySpec => {
      codeWriter.emit("\n")
      propertySpec.emit(codeWriter, [Modifier.PUBLIC], true);
    });

    // Indexables
    this.indexableSpecs.forEach(funSpec => {
      codeWriter.emit("\n")
      funSpec.emit(codeWriter, undefined, [Modifier.PUBLIC, Modifier.ABSTRACT]);
    });

    // Functions.
    this.functionSpecs.forEach(funSpec => {
      if (!funSpec.isConstructor) {
        codeWriter.emit("\n");
        funSpec.emit(codeWriter, this.name, [Modifier.PUBLIC, Modifier.ABSTRACT]);
      }
    });

    codeWriter.unindent();

    if (!this.hasNoBody) {
      codeWriter.emit("\n");
    }
    codeWriter.emit("}\n");
  }

  public toBuilder(): InterfaceSpecBuilder {
    return new InterfaceSpecBuilder(this.name)
      .addJavadocBlock(this.javaDoc)
      .addModifiers(...this.modifiers)
      .addTypeVariables(...this.typeVariables)
      .addSuperInterfaces(...this.superInterfaces)
      .addProperties(...this.propertySpecs)
      .addFunctions(...this.functionSpecs)
      .addIndexables(...this.indexableSpecs)
      .callable(this.callable);
  }

  private get hasNoBody(): boolean {
    return this.propertySpecs.length === 0 && this.functionSpecs.length === 0 && this.indexableSpecs.length === 0 && this.callable === undefined;
  }
}

export class InterfaceSpecBuilder {

  public javaDoc = CodeBlock.builder()
  public modifiers: Modifier[] = [];
  public typeVariables: TypeVariable[] = [];
  public superInterfaces: TypeName[] = [];
  public propertySpecs: PropertySpec[] = [];
  public functionSpecs: FunctionSpec[] = [];
  public indexableSpecs: FunctionSpec[] = [];
  public callableField?: FunctionSpec;

  constructor(public readonly name: string) {
  }

  public addJavadoc(format: string, ...args: any[]): this {
    this.javaDoc.add(format, ...args);
    return this;
  }

  public addJavadocBlock(block: CodeBlock): this {
    this.javaDoc.addCode(block);
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

  public addSuperInterfaces(...superInterfaces: TypeName[]): this {
    this.superInterfaces.push(...superInterfaces);
    return this;
  }

  public addSuperInterface(superClass: TypeName): this {
    this.superInterfaces.push(superClass);
    return this;
  }

  public addProperties(...propertySpecs: PropertySpec[]): this {
    propertySpecs.forEach(it => this.addProperty(it));
    return this;
  }

  public addProperty(propertySpec: PropertySpec): this {
    // require(propertySpec.decorators.isEmpty()) { "Interface properties cannot have decorators" }
    // require(propertySpec.initializer == null) { "Interface properties cannot have initializers" }
    this.propertySpecs.push(propertySpec);
    return this;
  }

  public addProperty2(name: string, type: TypeName, optional: boolean = false, ...modifiers: Modifier[]): this {
    return this.addProperty(PropertySpec.builder(name, type, optional, ...modifiers).build());
  }

  public addFunctions(...functionSpecs: FunctionSpec[]): this {
    functionSpecs.forEach(it => this.addFunction(it));
    return this;
  }

  public addFunction(functionSpec: FunctionSpec): this {
    // require(functionSpec.modifiers.contains(Modifier.ABSTRACT)) { "Interface methods must be abstract" }
    // require(functionSpec.body.isEmpty()) { "Interface methods cannot have code" }
    // require(!functionSpec.isConstructor) { "Interfaces cannot have a constructor" }
    // require(functionSpec.decorators.isEmpty()) { "Interface functions cannot have decorators" }
    this.functionSpecs.push(functionSpec);
    return this;
  }

  public addIndexables(...indexableSpecs: FunctionSpec[]): this {
    indexableSpecs.forEach(it => this.addIndexable(it));
    return this;
  }

  public addIndexable(functionSpec: FunctionSpec): this {
    // require(functionSpec.modifiers.contains(Modifier.ABSTRACT)) { "Indexables must be ABSTRACT" }
    this.indexableSpecs.push(functionSpec);
    return this;
  }

  public callable(callable?: FunctionSpec): this {
    if (callable) {
      // require(callable.isCallable) { "expected a callable signature but was ${callable.name}; use FunctionSpec.callableBuilder when building" }
      // require(callable.modifiers == setOf(Modifier.ABSTRACT)) { "Callable must be ABSTRACT and nothing else" }
    }
    this.callableField = callable;
    return this;
  }

  public build(): InterfaceSpec {
    return new InterfaceSpec(this);
  }
}
