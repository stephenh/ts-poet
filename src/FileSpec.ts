import { imm, Imm } from 'ts-imm';
import { ClassSpec } from './ClassSpec';
import { CodeBlock } from './CodeBlock';
import { CodeWriter } from './CodeWriter';
import { EnumSpec } from './EnumSpec';
import { FunctionSpec } from './FunctionSpec';
import { InterfaceSpec } from './InterfaceSpec';
import { Modifier } from './Modifier';
import { PropertySpec } from './PropertySpec';
import { StringBuffer } from './StringBuffer';
import { SymbolSpec, SymbolSpecs } from './SymbolSpecs';
import { TypeAliasSpec } from './TypeAliasSpec';
import { TypeName, TypeNames } from './TypeNames';
import { filterInstances } from './utils';

/**
 * A TypeScript file containing top level objects like classes, objects, functions, properties, and type
 * aliases.
 *
 * Items are output in the following order:
 * - Comment
 * - Imports
 * - Members
 */
export class FileSpec extends Imm<FileSpec> {
  /**
   * Creates a file to contain generated output.
   *
   * `file` should be the module name, e.g. for build/foo.ts, use file = foo.
   */
  public static create(file: string): FileSpec {
    return new FileSpec({
      path: file,
      comment: CodeBlock.empty(),
      members: [],
      indentField: '  ',
    });
  }

  @imm
  public readonly path!: string;
  @imm
  public readonly comment!: CodeBlock;
  @imm
  public readonly members!: any[];
  @imm
  public readonly indentField!: string;

  public exportType(typeName: string): TypeName | undefined {
    const typeNameParts = typeName.split('.');
    const en = this.exportNamed(typeNameParts[0]);
    return en === undefined ? en : TypeNames.anyType(typeName, en);
  }

  public exportNamed(symbolName: string): SymbolSpec | undefined {
    const first = this.members
      .map(it => {
        if (it instanceof ClassSpec) {
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
          throw new Error('unrecognized member type');
        }
      })
      .filter(name => name === symbolName)[0];
    return first ? SymbolSpecs.importsName(symbolName, '!' + this.path) : undefined;
  }

  public exportAll(localName: string): SymbolSpec {
    return SymbolSpecs.importsAll(localName, '!' + this.path);
  }

  public emit(out: StringBuffer) {
    // First pass: emit the entire class, just to collect the types we'll need to import.
    const importsCollector = new CodeWriter(new StringBuffer(), this.indentField);
    this.emitToWriter(importsCollector);
    const requiredImports = importsCollector.requiredImports();
    // Second pass: write the code, taking advantage of the imports.
    const codeWriter = new CodeWriter(out, this.indentField, new Set(requiredImports));
    this.emitToWriter(codeWriter);
  }

  public isEmpty(): boolean {
    return this.members.length === 0;
  }

  public isNotEmpty(): boolean {
    return !this.isEmpty();
  }

  public addComment(format: string, ...args: any[]): this {
    return this.copy({
      comment: this.comment.add(format, ...args),
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
    // require(!functionSpec.isConstructor) { "cannot add ${functionSpec.name} to file $path" }
    // require(functionSpec.decorators.isEmpty()) { "decorators on module functions are not allowed" }
    checkMemberModifiers(functionSpec.modifiers);
    return this.copy({
      members: [...this.members, functionSpec],
    });
  }

  public addProperty(propertySpec: PropertySpec): this {
    // requireExactlyOneOf(propertySpec.modifiers, Modifier.CONST, Modifier.LET, Modifier.VAR)
    // require(propertySpec.decorators.isEmpty()) { "decorators on file properties are not allowed" }
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

  public indent(indent: string): this {
    return this.copy({
      indentField: indent,
    });
  }

  public toString(): string {
    const out = new StringBuffer();
    this.emit(out);
    return out.toString();
  }

  private emitToWriter(codeWriter: CodeWriter) {
    if (this.comment.isNotEmpty()) {
      codeWriter.emitComment(this.comment);
    }

    codeWriter.emitImports(this.path.replace(/\.tsx?$/, ''));

    this.members
      .filter(it => !(it instanceof CodeBlock))
      .forEach(member => {
        codeWriter.emit('\n');
        if (member instanceof InterfaceSpec) {
          member.emit(codeWriter);
        } else if (member instanceof ClassSpec) {
          member.emit(codeWriter);
        } else if (member instanceof EnumSpec) {
          member.emit(codeWriter);
        } else if (member instanceof FunctionSpec) {
          member.emit(codeWriter, [Modifier.PUBLIC]);
        } else if (member instanceof PropertySpec) {
          member.emit(codeWriter, [Modifier.PUBLIC], true);
        } else if (member instanceof TypeAliasSpec) {
          member.emit(codeWriter);
        } else if (member instanceof CodeBlock) {
          codeWriter.emitCodeBlock(member);
        } else {
          throw new Error('unhandled');
        }
      });

    filterInstances(this.members, CodeBlock).forEach(member => {
      codeWriter.emit('\n');
      codeWriter.emitCodeBlock(member);
    });
  }
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

function checkMemberModifiers(modifiers: Modifier[]): void {
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
