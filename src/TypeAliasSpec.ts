/** A generated typealias declaration */
import { TypeName, TypeVariable } from "./TypeNames";
import { CodeBlock } from "./CodeBlock";
import { Modifier } from "./Modifier";
import { CodeWriter } from "./CodeWriter";

export class TypeAliasSpec {

  public static builder(name: string, type: TypeName): TypeAliasSpecBuilder {
    return new TypeAliasSpecBuilder(name, type);
  }

  public readonly name: string;
  public readonly type: TypeName;
  public readonly javaDoc: CodeBlock;
  public readonly modifiers: Modifier[] = [];
  public readonly typeVariables: TypeVariable[] = [];

  constructor(builder: TypeAliasSpecBuilder) {
    this.name = builder.name;
    this.type = builder.type;
    this.javaDoc = builder.javaDoc.build();
    this.modifiers.push(...builder.modifiers);
    this.typeVariables.push(...builder.typeVariables);
  }

  public emit(codeWriter: CodeWriter) {
    codeWriter.emitJavaDoc(this.javaDoc);
    codeWriter.emitModifiers(this.modifiers);
    codeWriter.emitCode("type %L", this.name);
    codeWriter.emitTypeVariables(this.typeVariables);
    codeWriter.emitCode(" = %T", this.type);
    codeWriter.emit(";\n");
  }

  public toBuilder(): TypeAliasSpecBuilder {
    return new TypeAliasSpecBuilder(this.name, this.type)
      .addJavadocBlock(this.javaDoc)
      .addModifiers(...this.modifiers)
      .addTypeVariables(...this.typeVariables);
  }
}

class TypeAliasSpecBuilder {

  public javaDoc = CodeBlock.builder()
  public modifiers: Modifier[] = [];
  public typeVariables: TypeVariable[] = [];

  constructor(
     public name: string,
     public type: TypeName) {}
   // require(name.isName) { "not a valid name: $name" }

  public addJavadoc(format: string, ...args: any[]): this {
    this.javaDoc.add(format, ...args);
    return this;
  }

  public addJavadocBlock(block: CodeBlock): this {
    this.javaDoc.addCode(block);
    return this;
  }

  public addModifiers(...modifiers: Modifier[]): this {
    modifiers.forEach(it => this.addModifier(it));
    return this;
  }

  public addModifier(modifier: Modifier): this {
    // require(modifier in setOf(Modifier.EXPORT)) { "unexpected typealias modifier $modifier"
    this.modifiers.push(modifier);
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

  public build(): TypeAliasSpec {
    return new TypeAliasSpec(this);
  }
}

