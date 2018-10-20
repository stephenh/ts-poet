import { imm, Imm } from "ts-imm";
import { CodeBlock } from "./CodeBlock";
import { CodeWriter } from "./CodeWriter";
import { FunctionSpec } from "./FunctionSpec";
import { Modifier } from "./Modifier";
import { PropertySpec } from "./PropertySpec";
import { TypeName, TypeVariable } from "./TypeNames";

/** A generated `interface` declaration. */
export class InterfaceSpec extends Imm<InterfaceSpec> {

  public static create(name: string): InterfaceSpec {
    return new InterfaceSpec({
      name,
      javaDoc: CodeBlock.empty(),
      modifiers: [],
      typeVariables: [],
      superInterfaces: [],
      propertySpecs: [],
      functionSpecs: [],
      indexableSpecs: [],
      callableField: undefined,
    });
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

  @imm public readonly name!: string;
  @imm public readonly javaDoc!: CodeBlock;
  @imm public readonly modifiers!: Modifier[];
  @imm public readonly typeVariables!: TypeVariable[];
  @imm public readonly superInterfaces!: TypeName[];
  @imm public readonly propertySpecs!: PropertySpec[];
  @imm public readonly functionSpecs!: FunctionSpec[];
  @imm public readonly indexableSpecs!: FunctionSpec[];
  @imm public readonly callableField?: FunctionSpec;

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
    if (this.callableField) {
      codeWriter.emitCode("\n");
      this.callableField.emit(codeWriter, undefined, [Modifier.ABSTRACT]);
    }

    // Properties.
    this.propertySpecs.forEach(propertySpec => {
      codeWriter.emit("\n");
      propertySpec.emit(codeWriter, [Modifier.PUBLIC], true);
    });

    // Indexables
    this.indexableSpecs.forEach(funSpec => {
      codeWriter.emit("\n");
      funSpec.emit(codeWriter, undefined, [Modifier.PUBLIC, Modifier.ABSTRACT]);
    });

    // Functions.
    this.functionSpecs.forEach(funSpec => {
      if (!funSpec.isConstructor()) {
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

  public addModifiers(...modifiers: Modifier[]): this {
    return this.copy({
      modifiers: [...this.modifiers, ...modifiers],
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

  public addSuperInterfaces(...superInterfaces: TypeName[]): this {
    return this.copy({
      superInterfaces: [...this.superInterfaces, ...superInterfaces],
    });
  }

  public addSuperInterface(superClass: TypeName): this {
    return this.copy({
      superInterfaces: [...this.superInterfaces, superClass],
    });
  }

  public addProperties(...propertySpecs: PropertySpec[]): this {
    // tslint:disable-next-line
    let curr = this;
    propertySpecs.forEach(it => {
      curr = curr.addProperty(it);
    });
    return curr;
  }

  public addProperty(propertySpec: PropertySpec): this {
    // require(propertySpec.decorators.isEmpty()) { "Interface properties cannot have decorators" }
    // require(propertySpec.initializer == null) { "Interface properties cannot have initializers" }
    return this.copy({
      propertySpecs: [...this.propertySpecs, propertySpec],
    });
  }

  public addProperty2(name: string, type: TypeName, optional: boolean = false, ...modifiers: Modifier[]): this {
    return this.addProperty(PropertySpec.create(name, type, optional, ...modifiers));
  }

  public addFunctions(...functionSpecs: FunctionSpec[]): this {
    // tslint:disable-next-line
    let curr = this;
    functionSpecs.forEach(it => {
      curr = curr.addFunction(it);
    });
    return curr;
  }

  public addFunction(functionSpec: FunctionSpec): this {
    // require(functionSpec.modifiers.contains(Modifier.ABSTRACT)) { "Interface methods must be abstract" }
    // require(functionSpec.body.isEmpty()) { "Interface methods cannot have code" }
    // require(!functionSpec.isConstructor) { "Interfaces cannot have a constructor" }
    // require(functionSpec.decorators.isEmpty()) { "Interface functions cannot have decorators" }
    return this.copy({
      functionSpecs: [...this.functionSpecs, functionSpec],
    });
  }

  public addIndexables(...indexableSpecs: FunctionSpec[]): this {
    // tslint:disable-next-line
    let curr = this;
    indexableSpecs.forEach(it => {
      curr = curr.addIndexable(it);
    });
    return curr;
  }

  public addIndexable(functionSpec: FunctionSpec): this {
    // require(functionSpec.modifiers.contains(Modifier.ABSTRACT)) { "Indexables must be ABSTRACT" }
    return this.copy({
      indexableSpecs: [...this.indexableSpecs, functionSpec],
    });
  }

  public callable(callable?: FunctionSpec): this {
    if (callable) {
      // require(callable.isCallable) { "expected a callable signature but was ${callable.name}; use FunctionSpec.callableBuilder when building" }
      // require(callable.modifiers == setOf(Modifier.ABSTRACT)) { "Callable must be ABSTRACT and nothing else" }
    }
    return this.copy({
      callableField: callable,
    });
  }

  private get hasNoBody(): boolean {
    return this.propertySpecs.length === 0 && this.functionSpecs.length === 0 && this.indexableSpecs.length === 0 && this.callableField === undefined;
  }
}
