import { arrayOf, Code, code, conditionalOutput, def, imp, joinCode, literalOf } from "../src";

describe("code", () => {
  it("basic interpolation", () => {
    const foo = "delicious";
    const a = code`${foo} taco`;
    expect(a.toCodeString([])).toEqual("delicious taco");
  });

  it("basic interpolation of booleans", () => {
    const foo = false;
    const a = code`${foo} taco`;
    expect(a.toCodeString([])).toEqual("false taco");
  });

  it("basic interpolation of null", () => {
    const foo = null;
    const a = code`${foo} taco`;
    expect(a.toCodeString([])).toEqual("null taco");
  });

  it("is pretty", () => {
    const b = code`if (true) { logTrue(); } else { logFalse(); }`;
    expect(b.toString()).toMatchInlineSnapshot(`
      "if (true) {
        logTrue();
      } else {
        logFalse();
      }
      "
    `);
  });

  it("can use symbols", () => {
    const b = code`
      class Foo extends ${imp("Bar@bar")} {}
    `;
    expect(b.toString()).toMatchInlineSnapshot(`
      "import { Bar } from "bar";

      class Foo extends Bar {}
      "
    `);
  });

  it("can add imports symbols", () => {
    const b = code`
      class Foo extends ${imp("Bar@bar")} {}
    `;
    expect(b.toString()).toMatchInlineSnapshot(`
      "import { Bar } from "bar";

      class Foo extends Bar {}
      "
    `);
  });

  it("can add type imports", () => {
    const a = imp("Foo@foo");
    const b = imp("t:Bar@foo");
    const c = code`
      class Zaz extends ${a} implements ${b} {}
    `;
    expect(c.toString()).toMatchInlineSnapshot(`
      "import { Foo } from "foo";
      import type { Bar } from "foo";

      class Zaz extends Foo implements Bar {}
      "
    `);
  });

  it("can add type imports and concrete impls", () => {
    const a = imp("Foo@foo");
    const b = imp("t:Foo@foo");
    const c = code`
      class Zaz extends ${a} implements ${b} {}
    `;
    expect(c.toString()).toMatchInlineSnapshot(`
      "import { Foo } from "foo";

      class Zaz extends Foo implements Foo {}
      "
    `);
  });

  it("can add type imports and concrete impls that are renamed", () => {
    const a = imp("Foo@foo");
    const b = imp("t:Foo@foo");
    const c = code`
      class ${def("Foo")} extends ${a} implements ${b} {}
    `;
    expect(c.toString()).toMatchInlineSnapshot(`
      "import { Foo as Foo1 } from "foo";

      class Foo extends Foo1 implements Foo1 {}
      "
    `);
  });

  it("can add a prefix before the imports", () => {
    const b = code`
      class Foo extends ${imp("Bar@bar")} {}
    `;
    expect(b.toString({ prefix: "/* eslint-disable */" })).toMatchInlineSnapshot(`
      "/* eslint-disable */
      import { Bar } from "bar";

      class Foo extends Bar {}
      "
    `);
  });

  it("dedups imports", () => {
    const b = code`
      const a = ${imp("Bar@bar")};
      const b = ${imp("Bar@bar")};
    `;
    expect(b.toString()).toMatchInlineSnapshot(`
      "import { Bar } from "bar";

      const a = Bar;
      const b = Bar;
      "
    `);
  });

  it("dedups star imports", () => {
    const b = code`
      const a = ${imp("Bar*bar")};
      const b = ${imp("Bar*bar")};
    `;
    expect(b.toString()).toMatchInlineSnapshot(`
      "import * as Bar from "bar";

      const a = Bar;
      const b = Bar;
      "
    `);
  });

  it("can nest codes", () => {
    const method1 = code`foo(): ${imp("Foo@foo")} { return "foo"; }`;
    const method2 = code`bar(): ${imp("Bar@bar")} { return "bar"; }`;
    const zaz = code`class Zaz { ${method1} ${method2} }`;
    expect(zaz.toString()).toMatchInlineSnapshot(`
      "import { Bar } from "bar";
      import { Foo } from "foo";

      class Zaz {
        foo(): Foo {
          return "foo";
        }
        bar(): Bar {
          return "bar";
        }
      }
      "
    `);
  });

  it("can nest lists of codes", () => {
    const method1 = code`foo(): ${imp("Foo@foo")} { return "foo"; }`;
    const method2 = code`bar(): ${imp("Bar@bar")} { return "bar"; }`;
    const zaz = code`class Zaz { ${[method1, method2]} }`;
    expect(zaz.toString()).toMatchInlineSnapshot(`
      "import { Bar } from "bar";
      import { Foo } from "foo";

      class Zaz {
        foo(): Foo {
          return "foo";
        }
        bar(): Bar {
          return "bar";
        }
      }
      "
    `);
  });

  it("can nest lists of strings", () => {
    const zaz = code`${["a", "b"]}`;
    expect(zaz.toString()).toEqual("ab;\n");
  });

  it("can nest iterables", () => {
    const obj = { a: 1, b: 2 };
    const zaz = code`${Object.values(obj).map((i) => i + 1)}`;
    expect(zaz.toString()).toEqual("23;\n");
  });

  it("can nest lists of imports", () => {
    const b = code`const types = ${[imp("Foo@foo"), ", ", imp("Bar@bar")]};`;
    expect(b.toString()).toMatchInlineSnapshot(`
      "import { Bar } from "bar";
      import { Foo } from "foo";

      const types = Foo, Bar;
      "
    `);
  });

  it("can interpolate object literals", () => {
    const obj = {
      a: 1,
      b: false,
      c: { d: "a string", e: new Date(0) },
    };
    const zaz = code`const foo = ${obj}`;
    expect(zaz.toString()).toMatchInlineSnapshot(`
      "const foo = { "a": 1, "b": false, "c": { "d": "a string", "e": "1970-01-01T00:00:00.000Z" } };
      "
    `);
  });

  it("can conditionally output helper methods", () => {
    const helperMethod = conditionalOutput("foo", code`function foo() { return 1; }`);
    const o = code`
      const a = ${helperMethod}();
      
      ${helperMethod.ifUsed}
    `;
    expect(o.toString()).toMatchInlineSnapshot(`
      "const a = foo();

      function foo() {
        return 1;
      }
      "
    `);
  });

  it("can conditionally not output helper methods", () => {
    const helperMethod = conditionalOutput("foo", code`function foo() { return 1; }`);
    const o = code`
      const a = notFoo();
      ${helperMethod.ifUsed}
    `;
    expect(o.toString()).toMatchInlineSnapshot(`
      "const a = notFoo();
      "
    `);
  });

  it("can conditionally output conditional helper methods", () => {
    const Foo = imp("Foo@./foo");
    const a = conditionalOutput("a", code`function a(): ${Foo} { return 1; }`);
    const b = conditionalOutput("b", code`function b() { return ${a}(); }`);
    const o = code`
      const foo = ${b}();
      ${a.ifUsed}
      ${b.ifUsed}
    `;
    expect(o.toString()).toMatchInlineSnapshot(`
      "import { Foo } from "./foo";

      const foo = b();
      function a(): Foo {
        return 1;
      }
      function b() {
        return a();
      }
      "
    `);
  });

  it("can double nest lists", () => {
    const method1 = code`foo(): ${imp("Foo@foo")} { return "foo"; }`;
    const method2 = code`bar(): ${imp("Bar@bar")} { return "bar"; }`;
    const method3 = code`footer(): ${imp("Footer:SelfFooter@footer")} { return "footer"; }`;
    const methods = [method1, method2, method3];
    const zaz = code`class Zaz { ${[methods]} }`;
    expect(zaz.toString()).toMatchInlineSnapshot(`
      "import { Bar } from "bar";
      import { Foo } from "foo";
      import { Footer as SelfFooter } from "footer";

      class Zaz {
        foo(): Foo {
          return "foo";
        }
        bar(): Bar {
          return "bar";
        }
        footer(): SelfFooter {
          return "footer";
        }
      }
      "
    `);
  });

  it("will use relative imports", () => {
    const method1 = code`foo(): ${imp("Foo@./foo/Foo")} { return "foo"; }`;
    const zaz = code`class Zaz { ${method1} }`;
    expect(zaz.toString({ path: "./zaz/Zaz" })).toMatchInlineSnapshot(`
      "import { Foo } from "../foo/Foo";

      class Zaz {
        foo(): Foo {
          return "foo";
        }
      }
      "
    `);
  });

  it("will skip same file imports", () => {
    const b = code`const f = ${imp("Foo@./foo")};`;
    expect(b.toString({ path: "foo.ts" })).toMatchInlineSnapshot(`
      "const f = Foo;
      "
    `);
  });

  it("avoids namespace collisions", () => {
    // Given we have some type Foo we want to import from another file
    // And we also define our own local foo
    const b = code`
      const ${def("Foo")} = {};
      const f1 = new ${imp("Foo@./bar")}();
      const f2 = new ${imp("Foo@./zaz")}();
      const f3 = new ${imp("Foo@./zaz")}();
    `;
    // Then we get a Foo alias.
    expect(b.toString()).toMatchInlineSnapshot(`
      "import { Foo as Foo1 } from "./bar";
      import { Foo as Foo2 } from "./zaz";

      const Foo = {};
      const f1 = new Foo1();
      const f2 = new Foo2();
      const f3 = new Foo2();
      "
    `);
  });

  it("avoids namespace collisions for imports", () => {
    const b = code`
      const f1 = new ${imp("Foo@./foo")}();
      const f2 = new ${imp("Foo@./bar")}();
      const f3 = new ${imp("Foo@./bar")}();
    `;
    expect(b.toString()).toMatchInlineSnapshot(`
      "import { Foo as Foo1 } from "./bar";
      import { Foo } from "./foo";

      const f1 = new Foo();
      const f2 = new Foo1();
      const f3 = new Foo1();
      "
    `);
  });

  it("can handle types defined in barrels", () => {
    // Given we want to import Foo from an index file
    // And we know that it's actually defined in ./foo
    const Foo = imp("Foo@./index", { definedIn: "./foo" });
    // When we use the Foo@./index type within ./foo itself
    const b = code`
      const ${def("Foo")} = {};
      const f1 = new ${Foo}();
      const f2 = new ${imp("Foo@./bar")}();
    `;
    // Then we don't need an import for f1
    expect(b.toString({ path: "foo.ts" })).toMatchInlineSnapshot(`
      "import { Foo as Foo1 } from "./bar";

      const Foo = {};
      const f1 = new Foo();
      const f2 = new Foo1();
      "
    `);
  });

  it("can make literal arrays", () => {
    const b = code`const types = ${arrayOf(imp("Foo@foo"), imp("Bar@bar"))};`;
    expect(b.toString()).toMatchInlineSnapshot(`
      "import { Bar } from "bar";
      import { Foo } from "foo";

      const types = [Foo, Bar];
      "
    `);
  });

  it("can make literal maps", () => {
    const map = {
      foo: code`1`,
      bar: code`2 as ${imp("Foo@foo")}`,
      "z-z": "zaz",
      zaz: { foo: code`3 as ${imp("Zaz@foo")}` },
    };
    const b = code`const map = ${map};`;
    expect(b.toString()).toMatchInlineSnapshot(`
      "import { Foo, Zaz } from "foo";

      const map = { "foo": 1, "bar": 2 as Foo, "z-z": "zaz", "zaz": { "foo": 3 as Zaz } };
      "
    `);
  });

  it("can mix literal objects and conditional output", () => {
    const helperMethod = conditionalOutput("foo", code`function foo() { return 1; }`);
    const o = code`
      module.exports = ${literalOf({ something: { method: code`${helperMethod}()` } })};
      
      ${helperMethod.ifUsed}
    `;
    expect(o.toString()).toMatchInlineSnapshot(`
      "module.exports = { "something": { "method": foo() } };

      function foo() {
        return 1;
      }
      "
    `);
  });

  it("can make literal strings", () => {
    const b = code`const str = ${literalOf("\n\r\v\t\b\f\u0000\xea'\"")};`;
    expect(b.toString()).toMatchInlineSnapshot(`
      "const str = "\\n\\r\\u000b\\t\\b\\f\\u0000ê'\\"";
      "
    `);
  });

  it("can force using the CJS default export", () => {
    const b = code`const types = [
      ${imp("Foo@foo")},
      ${imp("Bar@bar")},
      ${imp("Zaz@zaz")},
    ];`;
    expect(b.toString({ forceDefaultImport: ["foo", "bar"] })).toMatchInlineSnapshot(`
      "import _m1 from "bar";
      import _m0 from "foo";
      import { Zaz } from "zaz";

      const types = [_m0.Foo, _m1.Bar, Zaz];
      "
    `);
  });

  it("can force using the CJS default export with arrays", () => {
    const b = code`const types = ${arrayOf(imp("Foo@foo"), imp("Bar@bar"), imp("Zaz@zaz"))};`;
    expect(b.toString({ forceDefaultImport: ["foo", "bar"] })).toMatchInlineSnapshot(`
      "import _m1 from "bar";
      import _m0 from "foo";
      import { Zaz } from "zaz";

      const types = [_m0.Foo, _m1.Bar, Zaz];
      "
    `);
  });

  it("can force using the CJS default export in conditional output", () => {
    const Foo = imp("Foo@foo");
    const maybeFoo = conditionalOutput("foo", code`const foo = ${Foo}`);
    const b = code`
      ${maybeFoo.ifUsed}
      const foo1 = ${maybeFoo};
    `;
    expect(b.toString({ forceDefaultImport: ["foo"] })).toMatchInlineSnapshot(`
      "import _m0 from "foo";

      const foo = _m0.Foo;
      const foo1 = foo;
      "
    `);
  });

  it("can force using the CJS module export", () => {
    const b = code`const types = [
      ${imp("Foo@foo")},
      ${imp("Bar@bar")},
      ${imp("Zaz@zaz")},
    ];`;
    expect(b.toString({ forceModuleImport: ["foo", "bar"] })).toMatchInlineSnapshot(`
      "import * as _m1 from "bar";
      import * as _m0 from "foo";
      import { Zaz } from "zaz";

      const types = [_m0.Foo, _m1.Bar, Zaz];
      "
    `);
  });

  it("can force using the CJS module export with arrays", () => {
    const b = code`const types = ${arrayOf(imp("Foo@foo"), imp("Bar@bar"), imp("Zaz@zaz"))};`;
    expect(b.toString({ forceModuleImport: ["foo", "bar"] })).toMatchInlineSnapshot(`
      "import * as _m1 from "bar";
      import * as _m0 from "foo";
      import { Zaz } from "zaz";

      const types = [_m0.Foo, _m1.Bar, Zaz];
      "
    `);
  });

  it("can force using the CJS module export in conditional output", () => {
    const Foo = imp("Foo@foo");
    const maybeFoo = conditionalOutput("foo", code`const foo = ${Foo}`);
    const b = code`
      ${maybeFoo.ifUsed}
      const foo1 = ${maybeFoo};
    `;
    expect(b.toString({ forceModuleImport: ["foo"] })).toMatchInlineSnapshot(`
      "import * as _m0 from "foo";

      const foo = _m0.Foo;
      const foo1 = foo;
      "
    `);
  });

  it("can force using the CJS module export for default exports", () => {
    const b = code`const types = [
      ${imp("Foo=foo")},
      ${imp("Bar=bar")},
      ${imp("Zaz=zaz")},
    ];`;
    expect(b.toString({ forceModuleImport: ["foo", "bar"] })).toMatchInlineSnapshot(`
      "import * as Bar from "bar";
      import * as Foo from "foo";
      import Zaz from "zaz";

      const types = [Foo, Bar, Zaz];
      "
    `);
  });

  it("can force using the CJS require import for default exports", () => {
    const b = code`const types = [
      ${imp("Long=long")},
    ];`;
    expect(b.toString({ forceRequireImport: ["long"] })).toMatchInlineSnapshot(`
      "import Long = require("long");

      const types = [Long];
      "
    `);
  });

  it("can use ESM file paths", () => {
    const b = code`const types = [
      ${imp("Author@./Author.types.js")},
    ];`;
    expect(b.toString()).toMatchInlineSnapshot(`
      "import { Author } from "./Author.types.js";

      const types = [Author];
      "
    `);
  });

  it("can drop ESM file paths", () => {
    const b = code`const types = [
      ${imp("Author@./Author.types.js")},
    ];`;
    expect(b.toString({ importExtensions: false })).toMatchInlineSnapshot(`
      "import { Author } from "./Author.types";

      const types = [Author];
      "
    `);
  });

  it("can rewrite ESM file paths to ts", () => {
    const b = code`const types = [
      ${imp("Author@./Author.types.js")},
      ${imp("Book@./Book.types.jsx")},
    ];`;
    expect(b.toString({ importExtensions: "ts" })).toMatchInlineSnapshot(`
      "import { Author } from "./Author.types.ts";
      import { Book } from "./Book.types.tsx";

      const types = [Author, Book];
      "
    `);
  });

  it("can rewrite ESM file paths to js", () => {
    const b = code`const types = [
      ${imp("Author@./Author.types.ts")},
      ${imp("Book@./Book.types.tsx")},
    ];`;
    expect(b.toString({ importExtensions: "js" })).toMatchInlineSnapshot(`
      "import { Author } from "./Author.types.js";
      import { Book } from "./Book.types.jsx";

      const types = [Author, Book];
      "
    `);
  });

  it("can join chunks", () => {
    const chunks: Code[] = [];
    chunks.push(code`const a: ${imp("Foo@foo")};`);
    chunks.push(code`const b: ${imp("Bar@bar")};`);
    const b = joinCode(chunks);
    expect(b.toString()).toMatchInlineSnapshot(`
      "import { Bar } from "bar";
      import { Foo } from "foo";

      const a: Foo;
      const b: Bar;
      "
    `);
  });

  it("can join chunks and strip new lines", () => {
    const chunks: Code[] = [];
    chunks.push(code`
      if (true) {
        console.log("asdf");
      }
    `);
    chunks.push(code`
      if (true) {
        console.log("asdf");
      }
    `);
    const b = joinCode(chunks);
    expect(b.toString()).toMatchInlineSnapshot(`
      "if (true) {
        console.log("asdf");
      }
      if (true) {
        console.log("asdf");
      }
      "
    `);
  });

  it("can join different lengths", () => {
    const b = code`
      const a: ${joinCode([code`A`], { on: "|" })} = null!;
      const b: ${joinCode([code`B1`, code`B2`], { on: "|" })} = null!;
      const c: ${joinCode([], { on: "|" })} = null!;
      const d: ${joinCode([code`D1`, code`D2`, code`D3`, code`D4`], { on: "|" })} = null!;
    `;
    expect(b.toString()).toMatchInlineSnapshot(`
      "

            const a: A = null!;
            const b: B1|B2 = null!;
            const c:  = null!;
            const d: D1|D2|D3|D4 = null!;
          "
    `);
  });

  it("can format params", () => {
    const params: Code[] = [];
    params.push(code`a: ${imp("Foo@foo")}`);
    params.push(code`b: string`);
    const b = code`function foo(${joinCode(params, { on: "," })}) { return 1; }`;
    expect(b.toString()).toMatchInlineSnapshot(`
      "import { Foo } from "foo";

      function foo(a: Foo, b: string) {
        return 1;
      }
      "
    `);
  });

  it("can oneline code", () => {
    // Given we have several snippets that were built with newlines
    const a = code`
      {
        a: 1
      }
    `;
    const b = code`
      {
        a: ${a},
        b: 2,
      }
    `;
    // When we use those snippets with `asOneline`
    const c = code`
      const c = ${b.asOneline()};
      const d = 3;
    `;
    // Then it is output as a single line
    expect(c.toString()).toMatchInlineSnapshot(`
      "const c = { a: { a: 1 }, b: 2 };
      const d = 3;
      "
    `);
  });

  it("can override prettier config code", () => {
    const long = "abcdefghijklmnopqrstuvwxyz";
    // Given one line of code that pretty would wrap with our default printWidth
    const a = code`
      const a = {
        a: "${long}",
        b: "${long}",
        c: "${long}",
        d: "${long}",
      }
    `.asOneline();
    // When we format it with an overridden printWidth
    const o = a.toString({ dprintOptions: { lineWidth: 1000 } });
    // Then it was not wrapped
    expect(o).toMatchInlineSnapshot(`
      "const a = { a: "abcdefghijklmnopqrstuvwxyz", b: "abcdefghijklmnopqrstuvwxyz", c: "abcdefghijklmnopqrstuvwxyz", d: "abcdefghijklmnopqrstuvwxyz" };
      "
    `);
  });
});
