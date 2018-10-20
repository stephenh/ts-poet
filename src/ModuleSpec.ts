import { ClassSpec } from "./ClassSpec";
import { CodeBlock } from "./CodeBlock";
import { CodeWriter } from "./CodeWriter";
import { EnumSpec } from "./EnumSpec";
import { FunctionSpec } from "./FunctionSpec";
import { InterfaceSpec } from "./InterfaceSpec";
import { Modifier } from "./Modifier";
import { PropertySpec } from "./PropertySpec";
import { TypeAliasSpec } from "./TypeAliasSpec";
import { check } from "./utils";

/** A generated `module` declaration. */
export class ModuleSpec {

  public static builder(name: string): ModuleSpecBuilder {
    return new ModuleSpecBuilder(name);
  }

  public readonly name: string;
  public readonly javaDoc: CodeBlock;
  public readonly modifiers: Modifier[] = [];
  public readonly members: any[] = [];

  constructor(builder: ModuleSpecBuilder) {
    this.name = builder.name;
    this.javaDoc = builder.javaDoc;
    this.modifiers.push(...builder.modifiers);
    this.members.push(...builder.members);
  }

  public emit(codeWriter: CodeWriter) {
    if (this.javaDoc.isNotEmpty()) {
      codeWriter.emitComment(this.javaDoc);
    }

    if (this.modifiers.length > 0) {
      codeWriter.emitCode("%L ", this.modifiers.join(" "));
    }
    codeWriter.emitCode("module %L {\n", this.name);
    codeWriter.indent();

    if (this.members.length > 0) {
      codeWriter.emitCode("\n");
    }

    let index = 0;
    this.members.forEach(member => {
      if (index > 0) {
        codeWriter.emit("\n");
      }
      if (member instanceof ModuleSpec) {
        member.emit(codeWriter);
      } else if (member instanceof InterfaceSpec) {
        member.emit(codeWriter);
      } else if (member instanceof ClassSpec) {
        member.emit(codeWriter);
      } else if (member instanceof EnumSpec) {
        member.emit(codeWriter);
      } else if (member instanceof FunctionSpec) {
        member.emit(codeWriter, undefined, [Modifier.PUBLIC]);
      } else if (member instanceof PropertySpec) {
        member.emit(codeWriter, [Modifier.PUBLIC], true);
      } else if (member instanceof TypeAliasSpec) {
        member.emit(codeWriter);
      } else {
        throw new Error("unhandled");
      }
      index++;
    });

    if (this.members.length > 0) {
      codeWriter.emitCode("\n")
    }

    codeWriter.unindent();
    codeWriter.emitCode("}\n");
  }

  public isEmpty(): boolean {
    return this.members.length > 0;
  }

  public isNotEmpty(): boolean {
    return !this.isEmpty();
  }

  public toBuilder(): ModuleSpecBuilder {
    const builder = new ModuleSpecBuilder(this.name);
    // builder.javaDoc.add(javaDoc)
    // builder.modifiers += modifiers
    // builder.members.addAll(this.members)
    return builder;
  }
}

export class ModuleSpecBuilder {

  public javaDoc = CodeBlock.empty();
  public modifiers: Modifier[] = [];
  public members: any[] = [];

  constructor(public name: string) {}

  public addJavadoc(format: string, ...args: any[]): this {
    this.javaDoc = this.javaDoc.add(format, ...args);
    return this;
  }

  public addJavadocBlock(block: CodeBlock): this {
    this.javaDoc = this.javaDoc.addCode(block);
    return this;
  }

  public addModifier(modifier: Modifier): this {
    // requireNoneOrOneOf(modifiers + modifier, Modifier.EXPORT, Modifier.DECLARE)
    this.modifiers.push(modifier);
    return this;
  }

  public addModule(moduleSpec: ModuleSpec): this {
    this.members.push(moduleSpec);
    return this;
  }

  public addClass(classSpec: ClassSpec): this {
    this.checkMemberModifiers(classSpec.modifiers);
    this.members.push(classSpec);
    return this;
  }

  public addInterface(ifaceSpec: InterfaceSpec): this {
    this.checkMemberModifiers(ifaceSpec.modifiers);
    this.members.push(ifaceSpec);
    return this;
  }

  public addEnum(enumSpec: EnumSpec): this {
    this.checkMemberModifiers(enumSpec.modifiers);
    this.members.push(enumSpec);
    return this;
  }

  public addFunction(functionSpec: FunctionSpec): this {
    check(!functionSpec.isConstructor, `cannot add ${functionSpec.name} to module ${this.name}`);
    check(functionSpec.decorators.length === 0, "decorators on module functions are not allowed");
    this.checkMemberModifiers(functionSpec.modifiers);
    this.members.push(functionSpec);
    return this;
  }

  public addProperty(propertySpec: PropertySpec): this {
    // requireExactlyOneOf(propertySpec.modifiers, Modifier.CONST, Modifier.LET, Modifier.VAR)
    check(propertySpec.decorators.length === 0, "decorators on file properties are not allowed");
    this.checkMemberModifiers(propertySpec.modifiers);
    this.members.push(propertySpec);
    return this;
  }

  public addTypeAlias(typeAliasSpec: TypeAliasSpec): this {
    this.members.push(typeAliasSpec);
    return this;
  }

  public addCode(codeBlock: CodeBlock): this {
    this.members.push(codeBlock);
    return this;
  }

  public isEmpty(): boolean {
    return this.members.length === 0;
  }

  public isNotEmpty(): boolean {
    return !this.isEmpty();
  }

  public build(): ModuleSpec {
    return new ModuleSpec(this);
  }

  private checkMemberModifiers(modifiers: Modifier[]): void {
    // requireNoneOf(
    //   modifiers,
    //   Modifier.PUBLIC,
    //   Modifier.PROTECTED,
    //   Modifier.PRIVATE,
    //   Modifier.READONLY,
    //   Modifier.GET,
    //   Modifier.SET,
    //   Modifier.STATIC
    // )
  }
}

