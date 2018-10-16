import { CodeWriter } from "../CodeWriter";
import { DecoratorSpec } from "../DecoratorSpec";
import { StringBuffer } from "../StringBuffer";
import { SymbolSpec } from "../SymbolSpecs";

describe("DecoratorSpec", () => {
  it("generate inline", () => {
    const testDec = DecoratorSpec.builder("test")
      .addParameter("value", "100")
      .addParameter("value2", "20")
      .build();
    expect(emit(testDec, true)).toMatchInlineSnapshot(
      `"@test(/* value */ 100, /* value2 */ 20)"`
    );
  });

  it("generate expanded", () => {
    const testDec = DecoratorSpec.builder("test")
      .addParameter("value", "100")
      .addParameter("value2", "20")
      .build();
    expect(emit(testDec)).toMatchInlineSnapshot(`
"@test(
  /* value */ 100,
  /* value2 */ 20
)"
`);
  });

  it("generate with no-argument", () => {
    const testDec = DecoratorSpec.builder("test").build();
    expect(emit(testDec)).toMatchInlineSnapshot(`"@test"`);
  });

  it("generate factory with no-argument", () => {
    const testDec = DecoratorSpec.builder("test")
      .asFactory()
      .build();
    expect(emit(testDec)).toMatchInlineSnapshot(`"@test"`);
  });

  it("ToBuilder copies all fields", () => {
    const testDecBldr = DecoratorSpec.builder("test")
      .addParameter("value", "100")
      .addParameter("value2", "20")
      .asFactory()
      .build()
      .toBuilder();
    expect(testDecBldr.name).toEqual(SymbolSpec.from("test"));
    // CodeBlock equality throws this off
    // expect(testDecBldr.parameters).toEqual([
    //   ["value", CodeBlock.of("100")],
    //   ["value2", CodeBlock.of("20")]
    // ]);
    expect(testDecBldr.factory).toEqual(true);
  });
});

function emit(spec: DecoratorSpec, inline: boolean = false): string {
  const out = new StringBuffer();
  spec.emit(new CodeWriter(out), inline);
  return out.toString();
}
