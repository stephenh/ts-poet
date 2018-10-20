import { CodeWriter } from "../CodeWriter";
import { DecoratorSpec } from "../DecoratorSpec";
import { StringBuffer } from "../StringBuffer";
import { SymbolSpec } from "../SymbolSpecs";

describe("DecoratorSpec", () => {
  it("generate inline", () => {
    const testDec = DecoratorSpec.create("test")
      .addParameter("value", "100")
      .addParameter("value2", "20");
    expect(emit(testDec, true)).toMatchInlineSnapshot(
      `"@test(/* value */ 100, /* value2 */ 20)"`
    );
  });

  it("generate expanded", () => {
    const testDec = DecoratorSpec.create("test")
      .addParameter("value", "100")
      .addParameter("value2", "20");
    expect(emit(testDec)).toMatchInlineSnapshot(`
"@test(
  /* value */ 100,
  /* value2 */ 20
)"
`);
  });

  it("generate with no-argument", () => {
    const testDec = DecoratorSpec.create("test");
    expect(emit(testDec)).toMatchInlineSnapshot(`"@test"`);
  });

  it("generate factory with no-argument", () => {
    const testDec = DecoratorSpec.create("test").asFactory();
    expect(emit(testDec)).toMatchInlineSnapshot(`"@test()"`);
  });
});

function emit(spec: DecoratorSpec, inline: boolean = false): string {
  const out = new StringBuffer();
  spec.emit(new CodeWriter(out), inline);
  return out.toString();
}
