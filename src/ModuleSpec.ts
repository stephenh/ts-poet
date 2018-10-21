import { imm, Imm } from "ts-imm";
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
export class ModuleSpec extends Imm<ModuleSpec> {

  public static create(name: string): ModuleSpec {
    return new ModuleSpec({
      name,
      javaDoc: CodeBlock.empty(),
      modifiers: [],
      members: [],
    });
  }

  @imm public readonly name!: string;
  @imm public readonly javaDoc!: CodeBlock;
  @imm public readonly modifiers!: Modifier[];
  @imm public readonly members!: any[];

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

  public addModifier(modifier: Modifier): this {
    // requireNoneOrOneOf(modifiers + modifier, Modifier.EXPORT, Modifier.DECLARE)
    return this.copy({
      modifiers: [...this.modifiers, modifier],
    });
  }

  public addModule(moduleSpec: ModuleSpec): this {
    return this.copy({
      members: [...this.members, moduleSpec],
    });
  }

  public addClass(classSpec: ClassSpec): this {
    checkMemberModifiers(classSpec.modifiers);
    return this.copy({
      members: [...this.members, classSpec],
    });
  }

  public addInterface(ifaceSpec: InterfaceSpec): this {
    checkMemberModifiers(ifaceSpec.modifiers);
    return this.copy({
      members: [...this.members, ifaceSpec],
    });
  }

  public addEnum(enumSpec: EnumSpec): this {
    checkMemberModifiers(enumSpec.modifiers);
    return this.copy({
      members: [...this.members, enumSpec],
    });
  }

  public addFunction(functionSpec: FunctionSpec): this {
    check(!functionSpec.isConstructor(), `cannot add ${functionSpec.name} to module ${this.name}`);
    check(functionSpec.decorators.length === 0, "decorators on module functions are not allowed");
    checkMemberModifiers(functionSpec.modifiers);
    return this.copy({
      members: [...this.members, functionSpec],
    });
  }

  public addProperty(propertySpec: PropertySpec): this {
    // requireExactlyOneOf(propertySpec.modifiers, Modifier.CONST, Modifier.LET, Modifier.VAR)
    check(propertySpec.decorators.length === 0, "decorators on file properties are not allowed");
    checkMemberModifiers(propertySpec.modifiers);
    return this.copy({
      members: [...this.members, propertySpec],
    });
  }

  public addTypeAlias(typeAliasSpec: TypeAliasSpec): this {
    return this.copy({
      members: [...this.members, typeAliasSpec],
    });
  }

  public addCode(codeBlock: CodeBlock): this {
    return this.copy({
      members: [...this.members, codeBlock],
    });
  }

  public isEmpty(): boolean {
    return this.members.length > 0;
  }

  public isNotEmpty(): boolean {
    return !this.isEmpty();
  }

  public toString(): string {
    return CodeWriter.emitToString(this);
  }
}

function checkMemberModifiers(modifiers: Modifier[]): void {
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
