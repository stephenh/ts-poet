/** A generated `class` declaration. */
import { CodeBlock } from "./CodeBlock";
import { CodeWriter } from "./CodeWriter";
import { DecoratorSpec } from "./DecoratorSpec";
import { FunctionSpec } from "./FunctionSpec";
import { Modifier } from "./Modifier";
import { ParameterSpec } from "./ParameterSpec";
import { PropertySpec } from "./PropertySpec";
import { TypeName, TypeVariable } from "./TypeNames";

export class ClassSpec {

  public static builder(name: string | TypeName): ClassSpecBuilder {
    return new ClassSpecBuilder(typeof name === 'string' ? name : name.reference());
  }

  public readonly name: string;
  public readonly javaDoc: CodeBlock;
  public readonly decorators: DecoratorSpec[] = [];
  public readonly modifiers: Modifier[] = [];
  public readonly typeVariables: TypeVariable[] = [];
  public readonly superClass?: TypeName;
  public readonly mixins: TypeName[] = [];
  public readonly propertySpecs: PropertySpec[] = [];
  public readonly cstr?: FunctionSpec;
  public readonly functionSpecs: FunctionSpec[] = [];

  public constructor(public builder: ClassSpecBuilder) {
    this.name = builder.name;
    this.javaDoc = builder.javaDoc;
    this.decorators.push(...builder.decorators);
    this.modifiers.push(...builder.modifiers);
    this.typeVariables.push(...builder.typeVariables);
    this.superClass = builder.superClassField;
    this.mixins.push(...builder.mixins);
    this.propertySpecs.push(...builder.propertySpecs);
    this.cstr = builder.cstrField;
    this.functionSpecs.push(...builder.functionSpecs);
  }

  public emit(codeWriter: CodeWriter): void {
    const constructorProperties: Map<string, PropertySpec> = this.constructorProperties();

    codeWriter.emitJavaDoc(this.javaDoc);
    codeWriter.emitDecorators(this.decorators, false);
    codeWriter.emitModifiers(this.modifiers, [Modifier.PUBLIC]);
    codeWriter.emit("class");
    codeWriter.emitCode(" %L", this.name);
    codeWriter.emitTypeVariables(this.typeVariables);

    const sc = this.superClass ? CodeBlock.of("extends %T", this.superClass) : CodeBlock.empty();
    const mixins = CodeBlock.joinToCode(
      this.mixins.map(it => CodeBlock.of("%T", it)), ", ", "implements ");
    if (sc.isNotEmpty() && mixins.isNotEmpty()) {
      codeWriter.emitCode(" %L %L", sc, mixins);
    } else if (sc.isNotEmpty() || mixins.isNotEmpty()) {
      codeWriter.emitCode(" %L%L", sc, mixins);
    }

    codeWriter.emit(" {\n");
    codeWriter.indent();

    // Non-static properties.
    this.propertySpecs.forEach(propertySpec => {
      if (!constructorProperties.has(propertySpec.name)) {
        codeWriter.emit("\n")
        propertySpec.emit(codeWriter, [Modifier.PUBLIC], true);
      }
    });

    // Write the constructor manually, allowing the replacement
    // of property specs with constructor parameters
    if (this.cstr) {
      codeWriter.emit("\n");
      const it = this.cstr;
      if (it.decorators.length > 0) {
        codeWriter.emit(" ");
        codeWriter.emitDecorators(it.decorators, true);
        codeWriter.emit("\n");
      }
      if (it.modifiers.length > 0) {
        codeWriter.emitModifiers(it.modifiers);
      }
      codeWriter.emit("constructor");

      let body = it.body;
      // Emit constructor parameters & property specs that can be replaced with parameters
      ParameterSpec.emitAll(it.parameters, codeWriter, true, it.restParameter, (param, isRest) => {
        let property = constructorProperties.get(param.name);
        if (property && !isRest) {
          // Ensure the parameter always has a modifier (that makes it a property in TS)
          if (!property.modifiers.find(m => {
            return [Modifier.PUBLIC, Modifier.PRIVATE, Modifier.PROTECTED, Modifier.READONLY].indexOf(m) > -1;
          })) {
            // Add default public modifier
            property = property.addModifiers(Modifier.PUBLIC);
          }
          property.emit(codeWriter, [], false);
          param.emitDefaultValue(codeWriter);

          // Remove initializing statements
          body = body.remove(this.constructorPropertyInitSearch(property.name));
        } else {
          param.emit(codeWriter, isRest);
        }
      });

      codeWriter.emit(" {\n");
      codeWriter.indent();
      codeWriter.emitCodeBlock(body);
      codeWriter.unindent();
      codeWriter.emit("}\n");
    }

    // Constructors.
    this.functionSpecs.forEach(funSpec => {
      if (funSpec.isConstructor) {
        codeWriter.emit("\n");
        funSpec.emit(codeWriter, this.name, [Modifier.PUBLIC]);
      }
    });

    // Functions (static and non-static).
    this.functionSpecs.forEach(funSpec => {
      if (!funSpec.isConstructor) {
        codeWriter.emit("\n");
        funSpec.emit(codeWriter, this.name, [Modifier.PUBLIC]);
      }
    });

    codeWriter.unindent();

    if (!this.hasNoBody) {
      codeWriter.emit("\n");
    }
    codeWriter.emit("}\n");
  }

  public toBuilder(): ClassSpecBuilder {
    const builder = new ClassSpecBuilder(this.name);
    // builder.javaDoc.add(javaDoc)
    // builder.decorators += decorators
    // builder.modifiers += modifiers
    // builder.typeVariables += typeVariables
    // builder.superClass = superClass
    // builder.mixins += mixins
    // builder.propertySpecs += propertySpecs
    // builder.constructor = constructor
    // builder.functionSpecs += functionSpecs
    return builder;
  }

  /** Returns the properties that can be declared inline as constructor parameters. */
  private constructorProperties(): Map<string, PropertySpec> {
    const cstr = this.cstr;
    if (!cstr || !cstr.body) {
      return new Map();
    }
    const body = cstr.body.toString();
    const result: Map<string, PropertySpec> = new Map();
    this.propertySpecs.forEach(property => {
      const parameter = cstr.parameter(property.name);
      if (!parameter) return;
      if (parameter.type !== property.type) return;
      if (parameter.optional !== property.optional) return;
      if (property.initializer !== null) return;
      if (!body.match(this.constructorPropertyInitSearch(property.name))) return;
      result.set(property.name, property);
    });
    return result;
  }

  private constructorPropertyInitSearch(n: string): RegExp {
    return /`(\A|\n|;)\s*\Qthis.${n} = ${n}\E[ \t\x0B\f\r]*(\n|;|\z)`/;
  }

  private get hasNoBody(): boolean {
    if (this.propertySpecs.length > 0) {
      const constructorProperties = this.constructorProperties();
      const nonCstrProperties = this.propertySpecs.filter(p => !constructorProperties.has(p.name));
      if (nonCstrProperties.length > 0) {
        return false;
      }
    }
    return this.constructor === undefined && this.functionSpecs.length === 0;
  }
}

export class ClassSpecBuilder {

  public javaDoc = CodeBlock.empty();
  public decorators: DecoratorSpec[] = [];
  public modifiers: Modifier[] = [];
  public typeVariables: TypeVariable[] = [];
  public superClassField?: TypeName;
  public mixins: TypeName[] = [];
  public propertySpecs: PropertySpec[] = [];
  public cstrField?: FunctionSpec;
  public functionSpecs: FunctionSpec[] = [];

  constructor(public name: string) {}

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

  public superClass(superClass: TypeName): this {
    // check(this.superClass == null) { "superclass already set to ${this.superClass}" }
    this.superClassField = superClass;
    return this;
  }

  public addMixins(mixins: TypeName[]): this {
    this.mixins.push(...mixins);
    return this;
  }

  public addMixin(mixin: TypeName): this {
    this.mixins.push(mixin);
    return this;
  }

  public cstr(cstr?: FunctionSpec): this {
    if (cstr) {
      // require(constructor.isConstructor) { "expected a constructor but was ${constructor.name}; use FunctionSpec.constructorBuilder when building"
    }
    this.cstrField = cstr;
    return this;
  }

  public addProperties(...propertySpecs: PropertySpec[]): this {
    this.propertySpecs.push(...propertySpecs);
    return this;
  }

  public addProperty(propertySpec: PropertySpec): this {
    this.propertySpecs.push(propertySpec);
    return this;
  }

  public addProperty2(name: string, type: TypeName, optional: boolean = false, ...modifiers: Modifier[]): this {
    return this.addProperty(PropertySpec.create(name, type, optional, ...modifiers));
  }

  public addFunctions(...functionSpecs: FunctionSpec[]): this {
    functionSpecs.forEach(it => this.addFunction(it));
    return this;
  }

  public addFunction(functionSpec: FunctionSpec): this {
    // require(!functionSpec.isConstructor) { "Use the 'constructor' method for the constructor" }
    this.functionSpecs.push(functionSpec);
    return this;
  }

  public build(): ClassSpec {
    const isAbstract = this.modifiers.indexOf(Modifier.ABSTRACT) > -1;
    // for (functionSpec in functionSpecs) {
    //   require(isAbstract || !functionSpec.modifiers.contains(Modifier.ABSTRACT)) { "non-abstract type $name cannot declare abstract function ${functionSpec.name}" }
    // }
    return new ClassSpec(this);
  }
}

