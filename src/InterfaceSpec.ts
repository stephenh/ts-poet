import { imm, Imm } from 'ts-imm';
import { CodeBlock } from './CodeBlock';
import { CodeWriter } from './CodeWriter';
import { Encloser, FunctionSpec } from './FunctionSpec';
import { Modifier } from './Modifier';
import { PropertySpec } from './PropertySpec';
import { TypeName, TypeNames, TypeVariable } from './TypeNames';

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

  @imm
  public readonly name!: string;
  @imm
  public readonly javaDoc!: CodeBlock;
  @imm
  public readonly modifiers!: Modifier[];
  @imm
  public readonly typeVariables!: TypeVariable[];
  @imm
  public readonly superInterfaces!: TypeName[];
  @imm
  public readonly propertySpecs!: PropertySpec[];
  @imm
  public readonly functionSpecs!: FunctionSpec[];
  @imm
  public readonly indexableSpecs!: FunctionSpec[];
  @imm
  public readonly callableField?: FunctionSpec;

  public emit(codeWriter: CodeWriter): void {
    codeWriter.emitJavaDoc(this.javaDoc);
    codeWriter.emitModifiers(this.modifiers);
    codeWriter.emit('interface');
    codeWriter.emitCode(' %L', this.name);
    codeWriter.emitTypeVariables(this.typeVariables);

    const superClasses = this.superInterfaces.map(it => CodeBlock.of('%T', it));
    if (superClasses.length > 0) {
      codeWriter.emitCodeBlock(CodeBlock.joinToCode(superClasses, ', ', ' extends '));
    }

    codeWriter.emit(' {\n');
    codeWriter.indent();

    // If we have functions, then we'll break them apart by newlines. But if we don't have any functions,
    // we want to keep the body condensed, sans new lines. So only emit this beginning newline if we have
    // upcoming functions ...and we have a callable/property/indexable spec was otherwise we'll have two
    // newlines together in a row: this one and the one before the first function.
    if (this.functionSpecs.length > 0 && !(this.callableField || this.propertySpecs || this.indexableSpecs)) {
      codeWriter.newLine();
    }

    // Callable
    if (this.callableField) {
      this.callableField.emit(codeWriter, [Modifier.ABSTRACT]);
    }

    // Properties.
    this.propertySpecs.forEach(propertySpec => {
      propertySpec.emit(codeWriter, [Modifier.PUBLIC], true);
    });

    // Indexables
    this.indexableSpecs.forEach(funSpec => {
      funSpec.emit(codeWriter, [Modifier.PUBLIC, Modifier.ABSTRACT]);
    });

    // Functions.
    this.functionSpecs.forEach(funSpec => {
      if (!funSpec.isConstructor()) {
        codeWriter.newLine();
        funSpec.emit(codeWriter, [Modifier.PUBLIC, Modifier.ABSTRACT]);
      }
    });

    codeWriter.unindent();

    if (!this.hasNoBody && this.functionSpecs.length > 0) {
      codeWriter.newLine();
    }
    codeWriter.emit('}\n');
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
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let curr = this;
    propertySpecs.forEach(it => {
      curr = curr.addProperty(it);
    });
    return curr;
  }

  public addProperty(propertySpec: PropertySpec): this;
  public addProperty(name: string, type: TypeName | string, data: Partial<PropertySpec>): this;
  public addProperty(
    nameOrProp: string | PropertySpec,
    maybeType?: TypeName | string,
    maybeData?: Partial<PropertySpec>
  ): this {
    let propertySpec: PropertySpec;
    if (nameOrProp instanceof PropertySpec) {
      propertySpec = nameOrProp;
    } else {
      const name = nameOrProp;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const type = TypeNames.anyTypeMaybeString(maybeType!);
      const data = maybeData || {};
      propertySpec = PropertySpec.create(name, type).copy(data);
    }
    // require(propertySpec.decorators.isEmpty()) { "Interface properties cannot have decorators" }
    // require(propertySpec.initializer == null) { "Interface properties cannot have initializers" }
    return this.copy({
      propertySpecs: [...this.propertySpecs, propertySpec],
    });
  }

  public addFunctions(...functionSpecs: FunctionSpec[]): this {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
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
      functionSpecs: [...this.functionSpecs, functionSpec.setEnclosed(Encloser.INTERFACE)],
    });
  }

  public addIndexables(...indexableSpecs: FunctionSpec[]): this {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
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
      // require(callable.isCallable) { "expected a callable signature but was ${callable.name}; use FunctionSpec.createCallable when building" }
      // require(callable.modifiers == setOf(Modifier.ABSTRACT)) { "Callable must be ABSTRACT and nothing else" }
    }
    return this.copy({
      callableField: callable,
    });
  }

  public toString(): string {
    return CodeWriter.emitToString(this);
  }

  private get hasNoBody(): boolean {
    return (
      this.propertySpecs.length === 0 &&
      this.functionSpecs.length === 0 &&
      this.indexableSpecs.length === 0 &&
      this.callableField === undefined
    );
  }
}
