import { CodeWriter } from "../CodeWriter";
import { EnumSpec } from "../EnumSpec";
import { Modifier } from "../Modifier";
import { StringBuffer } from "../StringBuffer";

describe("EnumSpec", () => {
  it("testGenJavaDoc", () => {
    const testClass = EnumSpec.create("Test")
      .addJavadoc("this is a comment\n");
    const out = new StringBuffer();
    testClass.emit(new CodeWriter(out));
    expect(out.toString()).toMatchInlineSnapshot(`
"/**
 * this is a comment
 */
enum Test {
}
"
`);
  });

  it("testGenModifiersInOrder", () => {
    const testClass = EnumSpec.create("Test")
      .addModifiers(Modifier.EXPORT);
    const out = new StringBuffer();
    testClass.emit(new CodeWriter(out));
    expect(out.toString()).toMatchInlineSnapshot(`
"export enum Test {
}
"
`);
  });

  it("testGenConstants", () => {
    const testClass = EnumSpec.create("Test")
      .addConstant("A", "10")
      .addConstant("B", "20")
      .addConstant("C", "30");
    const out = new StringBuffer();
    testClass.emit(new CodeWriter(out));
    expect(out.toString()).toMatchInlineSnapshot(`
"enum Test {
  A = 10,
  B = 20,
  C = 30,
}
"
`);
  });
});
