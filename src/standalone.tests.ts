import { code, imp } from "./index";

describe("oxfmt formatting", () => {
  it("formats basic code", async () => {
    const b = code`1 +    1`;
    expect(await b.toStringAsync()).toMatchInlineSnapshot(`
      "1 + 1;
      "
    `);
  });

  it("supports jsx", async () => {
    const b = code`
      const a = <div
       class="test">    Test</div>;
    `;
    expect(await b.toStringAsync()).toMatchInlineSnapshot(`
"const a = <div
       class="test">    Test</div>;"
`);
  });

  it("resolves relative imports", async () => {
    let b = code`${imp("Simple@./ui")}`;
    expect(b.toString({ path: "ui/simple.ts" })).toContain("../ui");

    b = code`${imp("Simpleton@./another/path/to/ui")}`;
    expect(b.toString({ path: "another/path/to/ui/simple.ts" })).toContain("../ui");
  });
});
