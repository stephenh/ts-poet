import { CodeBlock } from "../CodeBlock";
import { CodeWriter } from "../CodeWriter";
import { DecoratorSpec } from "../DecoratorSpec";
import { FunctionSpec } from "../FunctionSpec";
import { Modifier } from "../Modifier";
import { ParameterSpec } from "../ParameterSpec";
import { StringBuffer } from "../StringBuffer";
import { TypeNames as TypeName } from "../TypeNames";

function emit(spec: FunctionSpec): string {
  const out = new StringBuffer();
  spec.emit(new CodeWriter(out));
  return out.toString();
}

describe("FunctionSpec", () => {
  it("generates JavaDoc at before class definition", () => {
    const testFunc = FunctionSpec.builder("test")
      .addJavadoc("this is a comment\n")
      .build();
    expect(emit(testFunc)).toMatchInlineSnapshot(`
"/**
 * this is a comment
 */
function test() {
}
"
`);
  });

  it("generates decorators formatted", () => {
    const testFunc = FunctionSpec.builder("test")
      .addDecorator(
        DecoratorSpec.builder("decorate")
          .addParameter(undefined, "true")
          .addParameter("targetType", "Test2")
          .build()
      )
      .build();
    expect(emit(testFunc)).toMatchInlineSnapshot(`
"@decorate(
  true,
  /* targetType */ Test2
)
function test() {
}
"
`);
  });

  it("generates modifiers in order", () => {
    const testClass = FunctionSpec.builder("test")
      .addModifiers(Modifier.PRIVATE, Modifier.GET, Modifier.EXPORT)
      .addCode("")
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"export private get function test() {
}
"
`);
  });

  it("generates no block when abstract", () => {
    const testClass = FunctionSpec.builder("test")
      .addModifiers(Modifier.PRIVATE, Modifier.ABSTRACT)
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"private abstract function test();
"
`);
  });

  it("generates type variables", () => {
    const testClass = FunctionSpec.builder("test")
      .addTypeVariable(TypeName.typeVariable("X", TypeName.bound("Test2")))
      .addTypeVariable(
        TypeName.typeVariable(
          "Y",
          TypeName.bound("Test3"),
          TypeName.intersectBound("Test4")
        )
      )
      .addTypeVariable(
        TypeName.typeVariable(
          "Z",
          TypeName.bound("Test5"),
          TypeName.unionBound("Test6", true)
        )
      )
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test<X extends Test2, Y extends Test3 & Test4, Z extends Test5 | keyof Test6>() {
}
"
`);
  });

  it("generates return type", () => {
    const testClass = FunctionSpec.builder("test")
      .returns(TypeName.anyType("Value"))
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test(): Value {
}
"
`);
  });

  it("generates no return type when void", () => {
    const testClass = FunctionSpec.builder("test")
      .returns(TypeName.VOID)
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test() {
}
"
`);
  });

  it("generates no return type when not set", () => {
    const testClass = FunctionSpec.builder("test").build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test() {
}
"
`);
  });

  it("generates parameters", () => {
    const testClass = FunctionSpec.builder("test")
      .addParameter("b", TypeName.STRING)
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test(b: string) {
}
"
`);
  });

  it("generates parameters with rest", () => {
    const testClass = FunctionSpec.builder("test")
      .addParameter("b", TypeName.STRING)
      .rest("c", TypeName.arrayType(TypeName.STRING))
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test(b: string, ... c: Array<string>) {
}
"
`);
  });

  it("generates parameters with default values", () => {
    const testClass = FunctionSpec.builder("test")
      .addParameter("a", TypeName.NUMBER, false, [], CodeBlock.of("10"))
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test(a: number = 10) {
}
"
`);
  });

  it("generates parameter decorators", () => {
    const testClass = FunctionSpec.builder("test")
      .addParameter(
        ParameterSpec.create("a", TypeName.NUMBER)
          .addDecorator(DecoratorSpec.builder("required").build())
          .addDecorator(
            DecoratorSpec.builder("size")
              .addParameter("min", "10")
              .addParameter("max", "100")
              .build()
          )
          .addDecorator(
            DecoratorSpec.builder("logged")
              .asFactory()
              .build()
          )
      )
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test(@required @size(/* min */ 10, /* max */ 100) @logged() a: number) {
}
"
`);
  });

  it("ToBuilder copies all fields", () => {
    const testFuncBlder = FunctionSpec.builder("Test")
      .addJavadoc("this is a comment\n")
      .addDecorator(
        DecoratorSpec.builder("decorate")
          .addParameter(undefined, "true")
          .addParameter("targetType", "Test2")
          .build()
      )
      .addModifiers(Modifier.EXPORT)
      .addTypeVariable(TypeName.typeVariable("X", TypeName.bound("Test2")))
      .addCode("val;\n")
      .build()
      .toBuilder();
    // expect(testFuncBlder.javaDoc.formatParts).hasItems("this is a comment\n");
    // expect(testFuncBlder.decorators.size).toEqual(1);
    // expect(testFuncBlder.decorators[0].name).toEqual(SymbolSpec.from("decorate"));
    // expect(testFuncBlder.decorators[0].parameters.size).toEqual(2);
    // expect(testFuncBlder.modifiers).toEqual([Modifier.EXPORT]);
    // expect(testFuncBlder.typeVariables.size).toEqual(1);
    // expect(testFuncBlder.body.formatParts).hasItems("val;\n");
  });
});
