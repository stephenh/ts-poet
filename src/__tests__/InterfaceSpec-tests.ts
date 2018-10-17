import { StringBuffer } from "../StringBuffer";
import { CodeWriter } from "../CodeWriter";
import { Modifier } from "../Modifier";
import { TypeNames } from "../TypeNames";
import { FunctionSpec } from "../FunctionSpec";
import { InterfaceSpec } from "../InterfaceSpec";

describe("InterfaceSpec", () => {
  it("generates JavaDoc at before interface definition", () => {
    const testIface = InterfaceSpec.builder("Test")
      .addJavadoc("this is a comment\n")
      .build();
    expect(emit(testIface)).toMatchInlineSnapshot(`
"/**
 * this is a comment
 */
interface Test {
}
"
`);
  });

  it("generates modifiers in order", () => {
    const testIface = InterfaceSpec.builder("Test")
      .addModifiers(Modifier.EXPORT)
      .build();
    expect(emit(testIface)).toMatchInlineSnapshot(`
"export interface Test {
}
"
`);
  });

  it("generates type variables", () => {
    const testIface = InterfaceSpec.builder("Test")
      .addTypeVariable(TypeNames.typeVariable("X", TypeNames.bound("Test2")))
      .addTypeVariable(
        TypeNames.typeVariable(
          "Y",
          TypeNames.bound("Test3"),
          TypeNames.intersectBound("Test4")
        )
      )
      .addTypeVariable(
        TypeNames.typeVariable(
          "Z",
          TypeNames.bound("Test5"),
          TypeNames.unionBound("Test6", true)
        )
      )
      .build();
    expect(emit(testIface)).toMatchInlineSnapshot(`
"interface Test<X extends Test2, Y extends Test3 & Test4, Z extends Test5 | keyof Test6> {
}
"
`);
  });

  it("generates super interfaces", () => {
    const testIface = InterfaceSpec.builder("Test")
      .addSuperInterface(TypeNames.anyType("Test2"))
      .addSuperInterface(TypeNames.anyType("Test3"))
      .build();
    expect(emit(testIface)).toMatchInlineSnapshot(`
"interface Test extends Test2, Test3 {
}
"
`);
  });

  it("generates type vars & super interfaces properly formatted", () => {
    const testIface = InterfaceSpec.builder("Test")
      .addTypeVariable(
        TypeNames.typeVariable(
          "Y",
          TypeNames.bound("Test3"),
          TypeNames.intersectBound("Test4")
        )
      )
      .addSuperInterface(TypeNames.anyType("Test2"))
      .addSuperInterface(TypeNames.anyType("Test3"))
      .addSuperInterface(TypeNames.anyType("Test4"))
      .build();
    expect(emit(testIface)).toMatchInlineSnapshot(`
"interface Test<Y extends Test3 & Test4> extends Test2, Test3, Test4 {
}
"
`);
  });

  it("generates property declarations", () => {
    const testIface = InterfaceSpec.builder("Test")
      .addProperty2("value", TypeNames.NUMBER, false, Modifier.PRIVATE)
      .addProperty2("value2", TypeNames.STRING, true, Modifier.PUBLIC)
      .build();
    expect(emit(testIface)).toMatchInlineSnapshot(`
"interface Test {

  private value: number;

  value2?: string;

}
"
`);
  });

  it("generates method declarations", () => {
    const testIface = InterfaceSpec.builder("Test")
      .addFunction(
        FunctionSpec.builder("test1")
          .addModifiers(Modifier.ABSTRACT)
          .build()
      )
      .addFunction(
        FunctionSpec.builder("test2")
          .addModifiers(Modifier.ABSTRACT)
          .build()
      )
      .build();
    expect(emit(testIface)).toMatchInlineSnapshot(`
"interface Test {

  test1();

  test2();

}
"
`);
  });

  it("generates indexing declarations", () => {
    const testIface = InterfaceSpec.builder("Test")
      .addIndexable(
        FunctionSpec.indexableBuilder()
          .addModifiers(Modifier.ABSTRACT)
          .addParameter("idx", TypeNames.STRING)
          .returns(TypeNames.ANY)
          .build()
      )
      .addIndexable(
        FunctionSpec.indexableBuilder()
          .addModifiers(Modifier.READONLY, Modifier.ABSTRACT)
          .addParameter("idx", TypeNames.STRING)
          .returns(TypeNames.ANY)
          .build()
      )
      .build();
    expect(emit(testIface)).toMatchInlineSnapshot(`
"interface Test {

  [idx: string]: any;

  readonly [idx: string]: any;

}
"
`);
  });

  it("generates callable declaration", () => {
    const testIface = InterfaceSpec.builder("Test")
      .callable(
        FunctionSpec.callableBuilder()
          .addModifiers(Modifier.ABSTRACT)
          .addParameter("a", TypeNames.STRING)
          .returns(TypeNames.anyType("Test"))
          .build()
      )
      .build();
    expect(emit(testIface)).toMatchInlineSnapshot(`
"interface Test {

  (a: string): Test;

}
"
`);
  });

  it("ToBuilder copies all fields", () => {
    const testIfaceBlder = InterfaceSpec.builder("Test")
      .addJavadoc("this is a comment\n")
      .addModifiers(Modifier.ABSTRACT, Modifier.EXPORT)
      .addTypeVariable(TypeNames.typeVariable("X", TypeNames.bound("Test2")))
      .addSuperInterface(TypeNames.anyType("Test3"))
      .addProperty2("value", TypeNames.NUMBER, false, Modifier.PRIVATE)
      .addProperty2("value2", TypeNames.STRING, false, Modifier.PUBLIC)
      .addFunction(
        FunctionSpec.builder("test1")
          .addModifiers(Modifier.ABSTRACT)
          .build()
      )
      .addIndexable(
        FunctionSpec.indexableBuilder()
          .addModifiers(Modifier.ABSTRACT)
          .addParameter("idx", TypeNames.STRING)
          .returns(TypeNames.ANY)
          .build()
      )
      .callable(
        FunctionSpec.callableBuilder()
          .addModifiers(Modifier.ABSTRACT)
          .build()
      )
      .build()
      .toBuilder();
    // expect(testIfaceBlder.javaDoc.formatParts, hasItems("this is a comment\n"))
    // expect(testIfaceBlder.modifiers.toImmutableSet(), equalTo(setOf(Modifier.ABSTRACT, Modifier.EXPORT)))
    // expect(testIfaceBlder.typeVariables.size, equalTo(1))
    // expect(testIfaceBlder.superInterfaces, hasItems<TypeName>( TypeName.anyType("Test3")))
    // expect(testIfaceBlder.propertySpecs.map { it.name }, hasItems("value", "value2"))
    // expect(testIfaceBlder.functionSpecs.map { it.name }, hasItems("test1"))
    // expect(testIfaceBlder.indexableSpecs.map { it.name }, hasItems("indexable()"))
    // expect(testIfaceBlder.callable?.name, equalTo("callable()"))
  });
});

function emit(spec: InterfaceSpec): string {
  const out = new StringBuffer();
  spec.emit(new CodeWriter(out));
  return out.toString();
}
