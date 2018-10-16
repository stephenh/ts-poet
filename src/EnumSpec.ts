import { CodeBlock } from "./CodeBlock";
import { Modifier } from "./Modifier";
import { check } from "./utils";
import { TypeName } from "./TypeNames";
import { CodeWriter } from "./CodeWriter";


export class EnumSpec {

  private readonly name: string;
  private readonly javaDoc: CodeBlock;
  private readonly modifiers: Modifier[];
  private readonly constants: Map<string, CodeBlock | undefined>;

  public constructor(private builder: EnumSpecBuilder) {
    this.name = builder.name;
    this.javaDoc = builder.javaDoc.build();
    this.modifiers = builder.modifiers;
    this.constants = builder.constants;
  }

  public emit(codeWriter: CodeWriter) {
    codeWriter.emitJavaDoc(this.javaDoc);
    codeWriter.emitModifiers(this.modifiers);
    codeWriter.emitCode("enum %L {\n", this.name);

    codeWriter.indent();
    let left = this.constants.size;
    this.constants.forEach((value, key) => {
      codeWriter.emitCode("%L", key);
      if (value) {
        codeWriter.emitCode(" = ")
        codeWriter.emitCodeBlock(value);
      }
      if (left-- > 0) {
        codeWriter.emit(",\n");
      } else {
        codeWriter.emit("\n");
      }
    });

    codeWriter.unindent();
    codeWriter.emit("}\n");
  }

  public toBuilder(): EnumSpecBuilder {
    const builder = new EnumSpecBuilder(this.name);
    builder.javaDoc.addCode(this.javaDoc);
    builder.modifiers.push(...this.modifiers);
    this.constants.forEach((v, k) => builder.constants.set(k, v));
    return builder;
  }

  private hasNoBody(): boolean {
    return this.constants.size === 0;
  }

}

export class EnumSpecBuilder {
  public static builder(name: string | TypeName): EnumSpecBuilder {
    return new EnumSpecBuilder(name instanceof TypeName ? name.reference() : name);
  }

  public javaDoc = CodeBlock.builder();
  public modifiers: Modifier[] = [];

  constructor(
    public name: string,
    public constants: Map<string, CodeBlock | undefined> = new Map()) {
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
    modifiers.forEach(it => check(it === Modifier.EXPORT || it === Modifier.DECLARE));
    modifiers.forEach(m => this.modifiers.push(m));
    return this;
  }

  public addConstant(name: string, initializer?: string | CodeBlock): this {
    // require(name.isName) { "not a valid enum constant: $name" }
    this.constants.set(name, typeof initializer === 'string' ? CodeBlock.of(initializer) : initializer);
    return this;
  }

  public build(): EnumSpec {
    return new EnumSpec(this);
  }
}
