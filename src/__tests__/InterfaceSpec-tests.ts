import { FunctionSpec } from "../FunctionSpec";
import { InterfaceSpec } from "../InterfaceSpec";
import { Modifier } from "../Modifier";
import { TypeNames } from "../TypeNames";

describe("InterfaceSpec", () => {
  it("generates JavaDoc at before interface definition", () => {
    const testIface = InterfaceSpec.create("Test")
      .addJavadoc("this is a comment\n");
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
    const testIface = InterfaceSpec.create("Test").addModifiers(Modifier.EXPORT);
    expect(emit(testIface)).toMatchInlineSnapshot(`
"export interface Test {
}
"
`);
  });

  it("generates type variables", () => {
    const testIface = InterfaceSpec.create("Test")
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
      );
    expect(emit(testIface)).toMatchInlineSnapshot(`
"interface Test<X extends Test2, Y extends Test3 & Test4, Z extends Test5 | keyof Test6> {
}
"
`);
  });

  it("generates super interfaces", () => {
    const testIface = InterfaceSpec.create("Test")
      .addSuperInterface(TypeNames.anyType("Test2"))
      .addSuperInterface(TypeNames.anyType("Test3"));
    expect(emit(testIface)).toMatchInlineSnapshot(`
"interface Test extends Test2, Test3 {
}
"
`);
  });

  it("generates type vars & super interfaces properly formatted", () => {
    const testIface = InterfaceSpec.create("Test")
      .addTypeVariable(
        TypeNames.typeVariable(
          "Y",
          TypeNames.bound("Test3"),
          TypeNames.intersectBound("Test4")
        )
      )
      .addSuperInterface(TypeNames.anyType("Test2"))
      .addSuperInterface(TypeNames.anyType("Test3"))
      .addSuperInterface(TypeNames.anyType("Test4"));
    expect(emit(testIface)).toMatchInlineSnapshot(`
"interface Test<Y extends Test3 & Test4> extends Test2, Test3, Test4 {
}
"
`);
  });

  it("generates property declarations", () => {
    const testIface = InterfaceSpec.create("Test")
      .addProperty("value", TypeNames.NUMBER, { modifiers: [ Modifier.PRIVATE ]})
      .addProperty("value2", TypeNames.STRING, { optional: true, modifiers: [ Modifier.PUBLIC ]});
    expect(emit(testIface)).toMatchInlineSnapshot(`
"interface Test {
  private value: number;
  value2?: string;
}
"
`);
  });

  it("generates method declarations", () => {
    const testIface = InterfaceSpec.create("Test")
      .addFunction(FunctionSpec.create("test1").addModifiers(Modifier.ABSTRACT))
      .addFunction(FunctionSpec.create("test2").addModifiers(Modifier.ABSTRACT));
    expect(emit(testIface)).toMatchInlineSnapshot(`
"interface Test {

  test1();

  test2();

}
"
`);
  });

  it("generates indexing declarations", () => {
    const testIface = InterfaceSpec.create("Test")
      .addIndexable(
        FunctionSpec.indexableBuilder()
          .addModifiers(Modifier.ABSTRACT)
          .addParameter("idx", TypeNames.STRING)
          .returns(TypeNames.ANY)
      )
      .addIndexable(
        FunctionSpec.indexableBuilder()
          .addModifiers(Modifier.READONLY, Modifier.ABSTRACT)
          .addParameter("idx", TypeNames.STRING)
          .returns(TypeNames.ANY)
      );
    expect(emit(testIface)).toMatchInlineSnapshot(`
"interface Test {
  [idx: string]: any;
  readonly [idx: string]: any;
}
"
`);
  });

  it("generates callable declaration", () => {
    const testIface = InterfaceSpec.create("Test")
      .callable(
        FunctionSpec.callableBuilder()
          .addModifiers(Modifier.ABSTRACT)
          .addParameter("a", TypeNames.STRING)
          .returns(TypeNames.anyType("Test"))
      );
    expect(emit(testIface)).toMatchInlineSnapshot(`
"interface Test {
  (a: string): Test;
}
"
`);
  });
});

function emit(spec: InterfaceSpec): string {
  return spec.toString();
}
