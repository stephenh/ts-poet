import { Modifier } from "../Modifier";
import { TypeAliasSpec } from "../TypeAliasSpec";
import { TypeNames } from "../TypeNames";

describe("TypeAliasSpec", () => {
  it("generates JavaDoc at before class definition", () => {
    const testAlias = TypeAliasSpec.create("Integer", TypeNames.NUMBER)
      .addJavadoc("this is a comment\n");
    expect(emit(testAlias)).toMatchInlineSnapshot(`
"/**
 * this is a comment
 */
type Integer = number;
"
`);
  });

  it("generates modifiers in order", () => {
    const testAlias = TypeAliasSpec
      .create("Integer", TypeNames.NUMBER)
      .addModifiers(Modifier.EXPORT);
    expect(emit(testAlias)).toMatchInlineSnapshot(`
"export type Integer = number;
"
`);
  });

  it("generates simple alias", () => {
    const testAlias = TypeAliasSpec.create("Integer", TypeNames.NUMBER);
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
    const testAlias = TypeAliasSpec.create(
      "StringMap",
      TypeNames.mapType(TypeNames.STRING, typeVar)
    )
      .addTypeVariable(typeVar);
    expect(emit(testAlias)).toMatchInlineSnapshot(`
"type StringMap<A extends Test> = Map<string, A>;
"
`);
  });
});

function emit(spec: TypeAliasSpec): string {
  return spec.toString();
}
