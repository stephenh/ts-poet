import { imm, Imm } from 'ts-imm';
import { CodeBlock, Dictionary } from './CodeBlock';
import { CodeWriter } from './CodeWriter';
import { DecoratorSpec } from './DecoratorSpec';
import { Modifier } from './Modifier';
import { ParameterSpec } from './ParameterSpec';
import { SymbolSpec } from './SymbolSpecs';
import { TypeName, TypeNameOrString, TypeNames, TypeVariable } from './TypeNames';

const CONSTRUCTOR = 'constructor()';
const CALLABLE = 'callable()';
const INDEXABLE = 'indexable()';

export enum Encloser {
  HASH,
  CLASS,
  INTERFACE,
}

/** A generated function declaration. */
export class FunctionSpec extends Imm<FunctionSpec> {
  public static create(name: string) {
    return new FunctionSpec({
      name,
      javaDoc: CodeBlock.empty(),
      decorators: [],
      modifiers: [],
      typeVariables: [],
      returnType: undefined,
      parameters: [],
      restParameter: undefined,
      body: CodeBlock.empty(),
      encloser: undefined,
    });
  }

  public static createConstructor() {
    return FunctionSpec.create(CONSTRUCTOR);
  }

  public static createCallable() {
    return FunctionSpec.create(CALLABLE);
  }

  public static createIndexable() {
    return FunctionSpec.create(INDEXABLE);
  }

  @imm
  public readonly name!: string;
  @imm
  public readonly javaDoc!: CodeBlock;
  @imm
  public readonly decorators!: DecoratorSpec[];
  @imm
  public readonly modifiers!: Modifier[];
  @imm
  public readonly typeVariables!: TypeVariable[];
  @imm
  public readonly returnType?: TypeName;
  @imm
  public readonly parameters!: ParameterSpec[];
  @imm
  public readonly restParameter!: ParameterSpec | undefined;
  @imm
  public readonly body!: CodeBlock;
  @imm
  public readonly encloser?: Encloser;

  /*
  init {
    require(body.isEmpty() || Modifier.ABSTRACT !in builder.modifiers) {
      "abstract function ${builder.name} cannot have code"
    }
  }
  */

  public abstract(): FunctionSpec {
    return FunctionSpec.create(this.name)
      .addModifiers(Modifier.ABSTRACT)
      .addTypeVariables(...this.typeVariables)
      .addParameters(...this.parameters);
  }

  public parameter(name: string): ParameterSpec | undefined {
    return this.parameters.find(it => it.name === name);
  }

  public emit(codeWriter: CodeWriter, implicitModifiers: Modifier[] = []): void {
    codeWriter.emitJavaDoc(this.javaDoc);
    codeWriter.emitDecorators(this.decorators, false);
    codeWriter.emitModifiers(this.modifiers, implicitModifiers);

    this.emitSignature(codeWriter);

    const isEmptyConstructor = this.isConstructor() && this.body.isEmpty();
    if (
      this.modifiers.includes(Modifier.ABSTRACT) ||
      implicitModifiers.includes(Modifier.ABSTRACT) ||
      isEmptyConstructor
    ) {
      codeWriter.emit(';\n');
      return;
    }

    codeWriter.emit(' {\n');
    codeWriter.indent();
    codeWriter.emitCodeBlock(this.body);
    codeWriter.unindent();
    codeWriter.emit('}');
    if (this.encloser !== Encloser.HASH) {
      codeWriter.emit('\n');
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

  public addDecorator(name: string | SymbolSpec, data?: Partial<DecoratorSpec>): this;
  public addDecorator(decorator: DecoratorSpec): this;
  public addDecorator(decorator: DecoratorSpec | string | SymbolSpec, data?: Partial<DecoratorSpec>): this {
    return this.copy({
      decorators: [...this.decorators, DecoratorSpec.fromMaybeString(decorator, data)],
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

  public returns(returnType: TypeNameOrString): this {
    // check(!name.isConstructor) { "$name cannot have a return type" }
    return this.copy({
      returnType: TypeNames.anyTypeMaybeString(returnType),
    });
  }

  public addParameters(...parameterSpecs: ParameterSpec[]): this {
    return this.copy({
      parameters: [...this.parameters, ...parameterSpecs],
    });
  }

  public addParameter(name: string, type: TypeName | string, data?: Partial<ParameterSpec>): this;
  public addParameter(parameterSpec: ParameterSpec): this;
  public addParameter(
    parameterSpec: ParameterSpec | string,
    maybeType?: TypeName | string,
    maybeData?: Partial<ParameterSpec>
  ): this {
    let param: ParameterSpec;
    if (typeof parameterSpec === 'string') {
      const name = parameterSpec;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const type: TypeName = TypeNames.anyTypeMaybeString(maybeType!);
      const data: Partial<ParameterSpec> = maybeData || {};
      param = ParameterSpec.create(name, type).copy(data);
    } else {
      param = parameterSpec;
    }
    return this.copy({
      parameters: [...this.parameters, param],
    });
  }

  /*
  public addParameter(name: String, type: TypeName, optional: Boolean = false, defaultValue: CodeBlock, vararg modifiers: Modifier)
     = addParameter(ParameterSpec.builder(name, type, optional,
                                                                              *modifiers).defaultValue(defaultValue).build())

  public addParameter(name: String, type: TypeName, optional: Boolean = false, vararg modifiers: Modifier)
     = addParameter(ParameterSpec.builder(name, type, optional, *modifiers).build())
     */

  public rest(name: string, type: TypeName | string): this;
  public rest(parameterSpec: ParameterSpec): this;
  public rest(parameterSpec: ParameterSpec | string, maybeType?: TypeName | string): this {
    let param: ParameterSpec;
    if (typeof parameterSpec === 'string') {
      const name = parameterSpec;
      const type: TypeName = TypeNames.anyTypeMaybeString(maybeType!);
      param = ParameterSpec.create(name, type);
    } else {
      param = parameterSpec;
    }
    return this.copy({
      restParameter: param,
    });
  }

  public addCode(format: string, ...args: unknown[]): this {
    // modifiers -= Modifier.ABSTRACT
    return this.copy({
      body: this.body.add(format, ...args),
    });
  }

  public addNamedCode(format: string, args: Dictionary<any>): this {
    // modifiers -= Modifier.ABSTRACT
    return this.copy({
      body: this.body.addNamed(format, args),
    });
  }

  public addCodeBlock(codeBlock: CodeBlock): this {
    // modifiers -= Modifier.ABSTRACT
    return this.copy({
      body: this.body.addCode(codeBlock),
    });
  }

  public addComment(format: string, ...args: any[]): this {
    return this.copy({
      body: this.body.add('// ' + format + '\n', ...args),
    });
  }

  /**
   * @param controlFlow the control flow construct and its code, such as "if (foo == 5)".
   * * Shouldn't contain braces or newline characters.
   */
  public beginControlFlow(controlFlow: string, ...args: any[]): this {
    // modifiers -= Modifier.ABSTRACT
    return this.copy({
      body: this.body.beginControlFlow(controlFlow, ...args),
    });
  }

  /**
   * @param controlFlow the control flow construct and its code, such as "else if (foo == 10)".
   * *     Shouldn't contain braces or newline characters.
   */
  public nextControlFlow(controlFlow: string, ...args: any[]): this {
    // modifiers -= Modifier.ABSTRACT
    return this.copy({
      body: this.body.nextControlFlow(controlFlow, ...args),
    });
  }

  public endControlFlow(): this {
    // modifiers -= Modifier.ABSTRACT
    return this.copy({
      body: this.body.endControlFlow(),
    });
  }

  public beginLambda(controlFlow: string, ...args: any[]): this {
    return this.copy({
      body: this.body.beginLambda(controlFlow, ...args),
    });
  }

  public endLambda(closing: string, ...args: any[]): this {
    return this.copy({
      body: this.body.endLambda(closing, ...args),
    });
  }

  public indent(): this {
    return this.copy({
      body: this.body.indent(),
    });
  }

  public unindent(): this {
    return this.copy({
      body: this.body.unindent(),
    });
  }

  public addStatement(format: string, ...args: any[]): this {
    // modifiers -= Modifier.ABSTRACT
    return this.copy({
      body: this.body.addStatement(format, ...args),
    });
  }

  public isConstructor(): boolean {
    return this.name === CONSTRUCTOR;
  }

  public isAccessor(): boolean {
    return this.modifiers.indexOf(Modifier.GET) > -1 || this.modifiers.indexOf(Modifier.SET) > -1;
  }

  public isCallable(): boolean {
    return this.name === CALLABLE;
  }

  public isIndexable(): boolean {
    return this.name === INDEXABLE;
  }

  public setEnclosed(encloser: Encloser): this {
    return this.copy({ encloser });
  }

  public toString(): string {
    return CodeWriter.emitToString(this);
  }

  private emitSignature(codeWriter: CodeWriter) {
    if (this.isConstructor()) {
      codeWriter.emitCode('constructor');
    } else if (this.isCallable()) {
      codeWriter.emitCode('');
    } else if (this.isIndexable()) {
      codeWriter.emitCode('[');
    } else {
      if (this.encloser === undefined) {
        codeWriter.emit('function ');
      }
      codeWriter.emitCode('%L', this.name);
    }
    if (this.typeVariables.length > 0) {
      codeWriter.emitTypeVariables(this.typeVariables);
    }
    ParameterSpec.emitAll(this.parameters, codeWriter, !this.isIndexable(), this.restParameter, undefined);
    if (this.isIndexable()) {
      codeWriter.emitCode(']');
    }
    if (this.returnType !== undefined && this.returnType !== TypeNames.VOID) {
      codeWriter.emitCode(': %T', this.returnType);
    }
  }
}
