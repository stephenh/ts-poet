import { CodeWriter } from "../CodeWriter";
import { EnumSpecBuilder } from "../EnumSpec";
import { Modifier } from "../Modifier";
import { StringBuffer } from "../StringBuffer";

describe("EnumSpec", () => {
  it("testGenJavaDoc", () => {
    const testClass = EnumSpecBuilder.builder("Test")
      .addJavadoc("this is a comment\n")
      .build();
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
    const testClass = EnumSpecBuilder.builder("Test")
      .addModifiers(Modifier.EXPORT)
      .build();
    const out = new StringBuffer();
    testClass.emit(new CodeWriter(out));
    expect(out.toString()).toMatchInlineSnapshot(`
"export enum Test {
}
"
`);
  });

  it("testGenConstants", () => {
    const testClass = EnumSpecBuilder.builder("Test")
      .addConstant("A", "10")
      .addConstant("B", "20")
      .addConstant("C", "30")
      .build();
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

  it("testToBuilder", () => {
    const testEnumBldr = EnumSpecBuilder.builder("Test")
      .addJavadoc("this is a comment\n")
      .addModifiers(Modifier.EXPORT)
      .addConstant("A", "10")
      .build()
      .toBuilder();
    expect(testEnumBldr.name).toEqual("Test");
    expect(testEnumBldr.javaDoc.formatParts).toContain("this is a comment\n");
    expect(testEnumBldr.modifiers).toContain(Modifier.EXPORT);
    expect(testEnumBldr.constants.keys()).toContain("A");
  });
});
