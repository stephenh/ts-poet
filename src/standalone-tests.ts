import { code } from "./index";

// When loaded from a CDN, most of them will use the standalone version of prettier because it has
// `"browser": "./standalone.js"` (and also "unpkg") in it's package.json. These tests verify basic functionality in
// that case. This is also important for Deno support, since using a CDN is the default method to import dependencies.

jest.mock("prettier", () => jest.requireActual("prettier/standalone"));

describe("standalone", () => {
  it("works with prettier/standalone", async () => {
    const b = code`1 +    1`;
    expect(b.toString()).toMatchInlineSnapshot(`
      "1 + 1;
      "
    `);
  });

  it("supports jsx", async () => {
    const b = code`
      const a = <div
       class="test">    Test</div>;
    `;
    expect(b.toString()).toMatchInlineSnapshot(`
      "const a = <div class="test">Test</div>;
      "
    `);
  });
});
