import _ from "lodash";
import { ClassSpec } from "./ClassSpec";
import { CodeBlock } from "./CodeBlock";
import { CodeWriter } from "./CodeWriter";
import { EnumSpec } from "./EnumSpec";
import { TypeName, TypeNames } from "./TypeNames";
import { Augmented, ImportsAll, ImportsName, SideEffect, SymbolSpec, SymbolSpecs } from "./SymbolSpecs";
import { ModuleSpec } from "./ModuleSpec";
import { InterfaceSpec } from "./InterfaceSpec";
import { FunctionSpec } from "./FunctionSpec";
import { PropertySpec } from "./PropertySpec";
import { TypeAliasSpec } from "./TypeAliasSpec";
import { StringBuffer } from "./StringBuffer";
import { Modifier } from "./Modifier";

/**
 * A TypeScript file containing top level objects like classes, objects, functions, properties, and type
 * aliases.
 *
 * Items are output in the following order:
 * - Comment
 * - Imports
 * - Members
 */
export class FileSpec {

  public static builder(file: string | ModuleSpec): FileSpecBuilder {
    const builder = new FileSpecBuilder(typeof file === 'string' ? file : file.name);
    if (file instanceof ModuleSpec) {
      builder.members.push(...file.members);
    }
    return builder;
  }

  public readonly path: string;
  public readonly comment: CodeBlock;
  public readonly members: any[] = [];
  public readonly indent: string;

  constructor(builder: FileSpecBuilder) {
    this.path = builder.path;
    this.comment = builder.comment.build();
    this.members.push(...builder.members);
    this.indent = builder.indentField;
  }

  public exportType(typeName: string): TypeName | undefined {
    const typeNameParts = typeName.split('.');
    const en = this.exportNamed(typeNameParts[0]);
    return en === undefined ? en : TypeNames.anyType(typeName, en);
  }

  public exportNamed(symbolName: string): SymbolSpec | undefined {
    const first = this.members.map(it => {
      if (it instanceof ModuleSpec) {
        return it.name;
      } else if (it instanceof ClassSpec) {
        return it.name;
      } else if (it instanceof InterfaceSpec) {
        return it.name;
      } else if (it instanceof EnumSpec) {
        return it.name;
      } else if (it instanceof FunctionSpec) {
        return it.name;
      } else if (it instanceof PropertySpec) {
        return it.name;
      } else if (it instanceof TypeAliasSpec) {
        return it.name;
      } else {
        throw new Error("unrecognized member type");
      }
    }).filter(name => name === symbolName)[0];
    return first ? SymbolSpecs.importsName(symbolName, "!" + this.path) : undefined;
  }

  public exportAll(localName: string): SymbolSpec {
    return SymbolSpecs.importsAll(localName, "!" + this.path);
  }

  public emit(out: StringBuffer) {
    // First pass: emit the entire class, just to collect the types we'll need to import.
    const importsCollector = new CodeWriter(new StringBuffer(), this.indent);
    this.emitToWriter(importsCollector);
    const requiredImports = importsCollector.requiredImports();
    // Second pass: write the code, taking advantage of the imports.
    const codeWriter = new CodeWriter(out, this.indent, new Set(requiredImports));
    this.emitToWriter(codeWriter);
  }

  public isEmpty(): boolean {
    return this.members.length === 0;
  }

  public isNotEmpty(): boolean {
    return !this.isEmpty();
  }

  public toBuilder(): FileSpecBuilder {
    const builder = new FileSpecBuilder(this.path);
    // builder.comment.add(comment)
    // builder.members.addAll(this.members)
    // builder.indent = indent
    return builder;
  }

  private emitToWriter(codeWriter: CodeWriter) {
    if (this.comment.isNotEmpty()) {
      codeWriter.emitComment(this.comment);
    }

    const imports = codeWriter.requiredImports();
    const augmentImports = _.groupBy(filterInstances(imports, Augmented), a => a.augmented);
    const sideEffectImports = _.groupBy(filterInstances(imports, SideEffect), a => a.source);

    if (imports.length > 0) {
      const m = _.groupBy(
        imports.filter(it => !(it instanceof Augmented) || !(it instanceof SideEffect)),
        it => it.source); // FileModules.importPath(this.path, it.source));
      // .toSortedMap()
      Object.entries(m).forEach(([sourceImportPath, imports]) => {
        if (this.path === sourceImportPath) { // || Paths.get(".").resolve(path) == sourceImportPath) {
          return;
        }
        filterInstances(imports, ImportsAll).forEach(i => {
          // Output star imports individually
          codeWriter.emitCode("%[import * as %L from '%L';\n%]", i.value, sourceImportPath);
          // Output related augments
          const augments = augmentImports[i.value];
          if (augments) {
            augments.forEach(augment => {
              codeWriter.emitCode("%[import '%L';\n%]", augment.source);
            });
          }
        });
        const names = filterInstances(imports, ImportsName).map(it => it.value);
        if (names.length > 0) {
          // Output named imports as a group
          codeWriter
            .emitCode("import {")
            .indent()
            .emitCode(names.join(", "))
            .unindent()
            .emitCode("} from '%L';\n", sourceImportPath);
          // Output related augments
          names.forEach(name => {
            const augments = augmentImports[name];
            if (augments) {
              augments.forEach(augment => {
                codeWriter.emitCode("%[import '%L';\n%]", augment.source);
              });
            }
          });
        }
      });

      Object.keys(sideEffectImports).forEach(it => {
        codeWriter.emitCode("%[import %S;\n%]", it);
      });

      codeWriter.emit("\n");
    }

    this.members
      .filter(it => !(it instanceof ModuleSpec || it instanceof CodeBlock))
      .forEach(member => {
        codeWriter.emit("\n")
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
        } else if (member instanceof CodeBlock) {
          codeWriter.emitCodeBlock(member);
        } else{
          throw new Error("unhandled");
        }
      });

    filterInstances(this.members, ModuleSpec).forEach(member => {
      codeWriter.emit("\n")
      member.emit(codeWriter);
    });

    filterInstances(this.members, CodeBlock).forEach(member => {
      codeWriter.emit("\n")
      codeWriter.emitCodeBlock(member);
    });
  }
}

interface Constructor<T> { new(... args: any[]): T };

function filterInstances<T, U>(list: T[], t: Constructor<U>): U[] {
  return list.filter(e => e instanceof t) as unknown as U[];
}

    // /** Writes this to `directory` as UTF-8 using the standard directory structure.  */
    // public writeTo(directory: Path) {
    //   require(Files.notExists(directory) || Files.isDirectory(directory)) {
    //     "path $directory exists but is not a directory."
    //   }
    //   const outputPath = directory.resolve("$path.ts")
    //   OutputStreamWriter(Files.newOutputStream(outputPath), UTF_8).use { writer -> writeTo(writer) }
    // }
    //
    // /** Writes this to `directory` as UTF-8 using the standard directory structure.  */
    // public writeTo(directory: File) = writeTo(directory.toPath())

export class FileSpecBuilder {

  public comment = CodeBlock.builder();
  public indentField = "  ";
  public readonly members: any[] = [];

  constructor(public path: string) {
  }

  public addComment(format: string, ...args: any[]): this {
    this.comment.add(format, ...args);
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
    this.checkMemberModifiers(enumSpec.modifiers)
    this.members.push(enumSpec);
    return this;
  }

  public addFunction(functionSpec: FunctionSpec): this {
    // require(!functionSpec.isConstructor) { "cannot add ${functionSpec.name} to file $path" }
    // require(functionSpec.decorators.isEmpty()) { "decorators on module functions are not allowed" }
    this.checkMemberModifiers(functionSpec.modifiers);
    this.members.push(functionSpec);
    return this;
  }

  public addProperty(propertySpec: PropertySpec): this {
    // requireExactlyOneOf(propertySpec.modifiers, Modifier.CONST, Modifier.LET, Modifier.VAR)
    // require(propertySpec.decorators.isEmpty()) { "decorators on file properties are not allowed" }
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

  public indent(indent: string): this {
    this.indentField = indent;
    return this;
  }

  public isEmpty(): boolean {
    return this.members.length === 0;
  }

  public isNotEmpty(): boolean {
    return !this.isEmpty();
  }

  public build(): FileSpec {
    return new FileSpec(this);
  }

  private checkMemberModifiers(modifiers: Modifier[]) {
    // requireNoneOf(
    //   modifiers,
    //   Modifier.PUBLIC,
    //   Modifier.PROTECTED,
    //   Modifier.PRIVATE,
    //   Modifier.READONLY,
    //   Modifier.GET,
    //   Modifier.SET,
    //   Modifier.STATIC,
    //   Modifier.CONST,
    //   Modifier.LET,
    //   Modifier.VAR
    // )
  }
}
