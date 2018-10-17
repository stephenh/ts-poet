import { TypeNames } from "../TypeNames";
import { StringBuffer } from "../StringBuffer";
import { CodeWriter } from "../CodeWriter";
import { Modifier } from "../Modifier";
import { TypeAliasSpec } from "../TypeAliasSpec";

describe("TypeAliasSpec", () => {
  it("generates JavaDoc at before class definition", () => {
    const testAlias = TypeAliasSpec.builder("Integer", TypeNames.NUMBER)
      .addJavadoc("this is a comment\n")
      .build();
    expect(emit(testAlias)).toMatchInlineSnapshot(`
"/**
 * this is a comment
 */
type Integer = number;
"
`);
  });

  it("generates modifiers in order", () => {
    const testAlias = TypeAliasSpec.builder("Integer", TypeNames.NUMBER)
      .addModifiers(Modifier.EXPORT)
      .build();
    expect(emit(testAlias)).toMatchInlineSnapshot(`
"export type Integer = number;
"
`);
  });

  it("generates simple alias", () => {
    const testAlias = TypeAliasSpec.builder(
      "Integer",
      TypeNames.NUMBER
    ).build();
    expect(emit(testAlias)).toMatchInlineSnapshot(`
"type Integer = number;
"
`);
  });

  it("generates generic alias", () => {
    const typeVar = TypeNames.typeVariable(
      "A",
      TypeNames.bound(TypeNames.anyType("Test"))
    );
    const testAlias = TypeAliasSpec.builder(
      "StringMap",
      TypeNames.mapType(TypeNames.STRING, typeVar)
    )
      .addTypeVariable(typeVar)
      .build();
    expect(emit(testAlias)).toMatchInlineSnapshot(`
"type StringMap<A extends Test> = Map<string, A>;
"
`);
  });

  it("ToBuilder copies all fields", () => {
    const testAliasBldr = TypeAliasSpec.builder("Test", TypeNames.NUMBER)
      .addJavadoc("this is a comment\n")
      .addModifiers(Modifier.EXPORT)
      .addTypeVariable(
        TypeNames.typeVariable("A", TypeNames.bound(TypeNames.anyType("Test")))
      )
      .build()
      .toBuilder();
    // assertThat(testAliasBldr.name, equalTo("Test"))
    // assertThat(testAliasBldr.type, equalTo<TypeName>(TypeName.NUMBER))
    // assertThat(testAliasBldr.javaDoc.formatParts, hasItems("this is a comment\n"))
    // assertThat(testAliasBldr.modifiers, hasItems(Modifier.EXPORT))
    // assertThat(testAliasBldr.typeVariables.map { it.name }, hasItems("A"))
  });
});

function emit(spec: TypeAliasSpec): string {
  const out = new StringBuffer();
  spec.emit(new CodeWriter(out));
  return out.toString();
}
