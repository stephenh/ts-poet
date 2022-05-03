import { arrayOf, Code, code, conditionalOutput, def, imp, joinCode, literalOf } from '../src';

describe('code', () => {
  it('basic interpolation', () => {
    const foo = 'delicious';
    const a = code`${foo} taco`;
    expect(a.toString()).toEqual('delicious taco');
  });

  it('basic interpolation of booleans', () => {
    const foo = false;
    const a = code`${foo} taco`;
    expect(a.toString()).toEqual('false taco');
  });

  it('basic interpolation of null', () => {
    const foo = null;
    const a = code`${foo} taco`;
    expect(a.toString()).toEqual('null taco');
  });

  it('is pretty', () => {
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

  it('can use symbols', async () => {
    const b = code`
      class Foo extends ${imp('Bar@bar')} {}
    `;
    expect(await b.toString()).toMatchInlineSnapshot(`
      "class Foo extends Bar {}
      "
    `);
  });

  it('can add imports symbols', async () => {
    const b = code`
      class Foo extends ${imp('Bar@bar')} {}
    `;
    expect(await b.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Bar } from 'bar';

      class Foo extends Bar {}
      "
    `);
  });

  it('can add type imports', async () => {
    const a = imp('Foo@foo');
    const b = imp('t:Bar@foo');
    const c = code`
      class Zaz extends ${a} implements ${b} {}
    `;
    expect(await c.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Foo } from 'foo';
      import type { Bar } from 'foo';

      class Zaz extends Foo implements Bar {}
      "
    `);
  });

  it('can add type imports and concrete impls', async () => {
    const a = imp('Foo@foo');
    const b = imp('t:Foo@foo');
    const c = code`
      class Zaz extends ${a} implements ${b} {}
    `;
    expect(await c.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Foo } from 'foo';

      class Zaz extends Foo implements Foo {}
      "
    `);
  });

  it('can add type imports and concrete impls that are renamed', async () => {
    const a = imp('Foo@foo');
    const b = imp('t:Foo@foo');
    const c = code`
      class ${def('Foo')} extends ${a} implements ${b} {}
    `;
    expect(await c.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Foo as Foo1 } from 'foo';

      class Foo extends Foo1 implements Foo1 {}
      "
    `);
  });

  it('can add a prefix before the imports', async () => {
    const b = code`
      class Foo extends ${imp('Bar@bar')} {}
    `;
    expect(await b.toStringWithImports({ prefix: '/* eslint-disable */' })).toMatchInlineSnapshot(`
      "/* eslint-disable */
      import { Bar } from 'bar';

      class Foo extends Bar {}
      "
    `);
  });

  it('dedups imports', async () => {
    const b = code`
      const a = ${imp('Bar@bar')};
      const b = ${imp('Bar@bar')};
    `;
    expect(await b.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Bar } from 'bar';

      const a = Bar;
      const b = Bar;
      "
    `);
  });

  it('dedups star imports', async () => {
    const b = code`
      const a = ${imp('Bar*bar')};
      const b = ${imp('Bar*bar')};
    `;
    expect(await b.toStringWithImports()).toMatchInlineSnapshot(`
      "import * as Bar from 'bar';

      const a = Bar;
      const b = Bar;
      "
    `);
  });

  it('can nest codes', async () => {
    const method1 = code`foo(): ${imp('Foo@foo')} { return "foo"; }`;
    const method2 = code`bar(): ${imp('Bar@bar')} { return "bar"; }`;
    const zaz = code`class Zaz { ${method1} ${method2} }`;
    expect(await zaz.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Foo } from 'foo';
      import { Bar } from 'bar';

      class Zaz {
        foo(): Foo {
          return 'foo';
        }
        bar(): Bar {
          return 'bar';
        }
      }
      "
    `);
  });

  it('can nest lists of codes', async () => {
    const method1 = code`foo(): ${imp('Foo@foo')} { return "foo"; }`;
    const method2 = code`bar(): ${imp('Bar@bar')} { return "bar"; }`;
    const zaz = code`class Zaz { ${[method1, method2]} }`;
    expect(await zaz.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Foo } from 'foo';
      import { Bar } from 'bar';

      class Zaz {
        foo(): Foo {
          return 'foo';
        }
        bar(): Bar {
          return 'bar';
        }
      }
      "
    `);
  });

  it('can nest lists of strings', async () => {
    const zaz = code`${['a', 'b']}`;
    expect(await zaz.toStringWithImports()).toEqual('ab;\n');
  });

  it('can nest iterables', async () => {
    const obj = { a: 1, b: 2 };
    const zaz = code`${Object.values(obj).map((i) => i + 1)}`;
    expect(await zaz.toStringWithImports()).toEqual('23;\n');
  });

  it('can nest lists of imports', async () => {
    const b = code`const types = ${[imp('Foo@foo'), ', ', imp('Bar@bar')]};`;
    expect(await b.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Foo } from 'foo';
      import { Bar } from 'bar';

      const types = Foo,
        Bar;
      "
    `);
  });

  it('can interpolate object literals', async () => {
    const obj = {
      a: 1,
      b: false,
      c: { d: 'a string', e: new Date(0) },
    };
    const zaz = code`const foo = ${obj}`;
    expect(await zaz.toStringWithImports()).toMatchInlineSnapshot(`
      "const foo = { a: 1, b: false, c: { d: 'a string', e: '1970-01-01T00:00:00.000Z' } };
      "
    `);
  });

  it('can conditionally output helper methods', async () => {
    const helperMethod = conditionalOutput('foo', code`function foo() { return 1; }`);
    const o = code`
      const a = ${helperMethod}();
      
      ${helperMethod.ifUsed}
    `;
    expect(await o.toStringWithImports()).toMatchInlineSnapshot(`
      "const a = foo();

      function foo() {
        return 1;
      }
      "
    `);
  });

  it('can conditionally not output helper methods', async () => {
    const helperMethod = conditionalOutput('foo', code`function foo() { return 1; }`);
    const o = code`
      const a = notFoo();
      ${helperMethod.ifUsed}
    `;
    expect(await o.toStringWithImports()).toMatchInlineSnapshot(`
      "const a = notFoo();
      "
    `);
  });

  it('can conditionally output conditional helper methods', async () => {
    const Foo = imp('Foo@./foo');
    const a = conditionalOutput('a', code`function a(): ${Foo} { return 1; }`);
    const b = conditionalOutput('b', code`function b() { return ${a}(); }`);
    const o = code`
      const foo = ${b}();
      ${a.ifUsed}
      ${b.ifUsed}
    `;
    expect(await o.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Foo } from './foo';

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

  it('can double nest lists', async () => {
    const method1 = code`foo(): ${imp('Foo@foo')} { return "foo"; }`;
    const method2 = code`bar(): ${imp('Bar@bar')} { return "bar"; }`;
    const method3 = code`footer(): ${imp('Footer:SelfFooter@footer')} { return "footer"; }`;
    const methods = [method1, method2, method3];
    const zaz = code`class Zaz { ${[methods]} }`;
    expect(await zaz.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Foo } from 'foo';
      import { Bar } from 'bar';
      import { Footer as SelfFooter } from 'footer';

      class Zaz {
        foo(): Foo {
          return 'foo';
        }
        bar(): Bar {
          return 'bar';
        }
        footer(): SelfFooter {
          return 'footer';
        }
      }
      "
    `);
  });

  it('will use relative imports', async () => {
    const method1 = code`foo(): ${imp('Foo@./foo/Foo')} { return "foo"; }`;
    const zaz = code`class Zaz { ${method1} }`;
    expect(await zaz.toStringWithImports({ path: './zaz/Zaz' })).toMatchInlineSnapshot(`
      "import { Foo } from '../foo/Foo';

      class Zaz {
        foo(): Foo {
          return 'foo';
        }
      }
      "
    `);
  });

  it('will skip same file imports', async () => {
    const b = code`const f = ${imp('Foo@./foo')};`;
    expect(await b.toStringWithImports({ path: 'foo.ts' })).toMatchInlineSnapshot(`
      "const f = Foo;
      "
    `);
  });

  it('avoids namespace collisions', async () => {
    // Given we have some type Foo we want to import from another file
    // And we also define our own local foo
    const b = code`
      const ${def('Foo')} = {};
      const f1 = new ${imp('Foo@./bar')}();
      const f2 = new ${imp('Foo@./zaz')}();
      const f3 = new ${imp('Foo@./zaz')}();
    `;
    // Then we get a Foo alias.
    expect(await b.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Foo as Foo1 } from './bar';
      import { Foo as Foo2 } from './zaz';

      const Foo = {};
      const f1 = new Foo1();
      const f2 = new Foo2();
      const f3 = new Foo2();
      "
    `);
  });

  it('avoids namespace collisions for imports', async () => {
    const b = code`
      const f1 = new ${imp('Foo@./foo')}();
      const f2 = new ${imp('Foo@./bar')}();
      const f3 = new ${imp('Foo@./bar')}();
    `;
    expect(await b.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Foo } from './foo';
      import { Foo as Foo1 } from './bar';

      const f1 = new Foo();
      const f2 = new Foo1();
      const f3 = new Foo1();
      "
    `);
  });

  it('can handle types defined in barrels', async () => {
    // Given we want to import Foo from an index file
    // And we know that it's actually defined in ./foo
    const Foo = imp('Foo@./index', { definedIn: './foo' });
    // When we use the Foo@./index type within ./foo itself
    const b = code`
      const ${def('Foo')} = {};
      const f1 = new ${Foo}();
      const f2 = new ${imp('Foo@./bar')}();
    `;
    // Then we don't need an import for f1
    expect(await b.toStringWithImports({ path: 'foo.ts' })).toMatchInlineSnapshot(`
      "import { Foo as Foo1 } from './bar';

      const Foo = {};
      const f1 = new Foo();
      const f2 = new Foo1();
      "
    `);
  });

  it('can make literal arrays', async () => {
    const b = code`const types = ${arrayOf(imp('Foo@foo'), imp('Bar@bar'))};`;
    expect(await b.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Foo } from 'foo';
      import { Bar } from 'bar';

      const types = [Foo, Bar];
      "
    `);
  });

  it('can make literal maps', async () => {
    const map = {
      foo: code`1`,
      bar: code`2 as ${imp('Foo@foo')}`,
      'z-z': 'zaz',
      zaz: { foo: code`3 as ${imp('Zaz@foo')}` },
    };
    const b = code`const map = ${map};`;
    expect(await b.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Foo, Zaz } from 'foo';

      const map = { foo: 1, bar: 2 as Foo, 'z-z': 'zaz', zaz: { foo: 3 as Zaz } };
      "
    `);
  });

  it('can mix literal objects and conditional output', async () => {
    const helperMethod = conditionalOutput('foo', code`function foo() { return 1; }`);
    const o = code`
      module.exports = ${literalOf({ something: { method: code`${helperMethod}()` } })};
      
      ${helperMethod.ifUsed}
    `;
    expect(await o.toStringWithImports()).toMatchInlineSnapshot(`
      "module.exports = { something: { method: foo() } };

      function foo() {
        return 1;
      }
      "
    `);
  });

  it('can make literal strings', async () => {
    const b = code`const str = ${literalOf('\n\r\v\t\b\f\u0000\xea\'"')};`;
    expect(await b.toStringWithImports()).toMatchInlineSnapshot(`
      "const str = '\\\\n\\\\r\\\\u000b\\\\t\\\\b\\\\f\\\\u0000ê\\\\'\\"';
      "
    `);
  });

  it('can force using the CJS default export', async () => {
    const b = code`const types = [
      ${imp('Foo@foo')},
      ${imp('Bar@bar')},
      ${imp('Zaz@zaz')},
    ];`;
    expect(await b.toStringWithImports({ forceDefaultImport: ['foo', 'bar'] })).toMatchInlineSnapshot(`
      "import { Zaz } from 'zaz';
      import _m0 from 'foo';
      import _m1 from 'bar';

      const types = [_m0.Foo, _m1.Bar, Zaz];
      "
    `);
  });

  it('can force using the CJS default export with arrays', async () => {
    const b = code`const types = ${arrayOf(imp('Foo@foo'), imp('Bar@bar'), imp('Zaz@zaz'))};`;
    expect(await b.toStringWithImports({ forceDefaultImport: ['foo', 'bar'] })).toMatchInlineSnapshot(`
      "import { Zaz } from 'zaz';
      import _m0 from 'foo';
      import _m1 from 'bar';

      const types = [_m0.Foo, _m1.Bar, Zaz];
      "
    `);
  });

  it('can force using the CJS default export in conditional output', async () => {
    const Foo = imp('Foo@foo');
    const maybeFoo = conditionalOutput('foo', code`const foo = ${Foo}`);
    const b = code`
      ${maybeFoo.ifUsed}
      const foo1 = ${maybeFoo};
    `;
    expect(await b.toStringWithImports({ forceDefaultImport: ['foo'] })).toMatchInlineSnapshot(`
      "import _m0 from 'foo';

      const foo = _m0.Foo;
      const foo1 = foo;
      "
    `);
  });

  it('can force using the CJS module export', async () => {
    const b = code`const types = [
      ${imp('Foo@foo')},
      ${imp('Bar@bar')},
      ${imp('Zaz@zaz')},
    ];`;
    expect(await b.toStringWithImports({ forceModuleImport: ['foo', 'bar'] })).toMatchInlineSnapshot(`
      "import { Zaz } from 'zaz';
      import * as _m0 from 'foo';
      import * as _m1 from 'bar';

      const types = [_m0.Foo, _m1.Bar, Zaz];
      "
    `);
  });

  it('can force using the CJS module export with arrays', async () => {
    const b = code`const types = ${arrayOf(imp('Foo@foo'), imp('Bar@bar'), imp('Zaz@zaz'))};`;
    expect(await b.toStringWithImports({ forceModuleImport: ['foo', 'bar'] })).toMatchInlineSnapshot(`
      "import { Zaz } from 'zaz';
      import * as _m0 from 'foo';
      import * as _m1 from 'bar';

      const types = [_m0.Foo, _m1.Bar, Zaz];
      "
    `);
  });

  it('can force using the CJS module export in conditional output', async () => {
    const Foo = imp('Foo@foo');
    const maybeFoo = conditionalOutput('foo', code`const foo = ${Foo}`);
    const b = code`
      ${maybeFoo.ifUsed}
      const foo1 = ${maybeFoo};
    `;
    expect(await b.toStringWithImports({ forceModuleImport: ['foo'] })).toMatchInlineSnapshot(`
      "import * as _m0 from 'foo';

      const foo = _m0.Foo;
      const foo1 = foo;
      "
    `);
  });

  it('can join chunks', async () => {
    const chunks: Code[] = [];
    chunks.push(code`const a: ${imp('Foo@foo')};`);
    chunks.push(code`const b: ${imp('Bar@bar')};`);
    const b = joinCode(chunks);
    expect(await b.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Foo } from 'foo';
      import { Bar } from 'bar';

      const a: Foo;
      const b: Bar;
      "
    `);
  });

  it('can join chunks and strip new lines', async () => {
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
    expect(await b.toStringWithImports()).toMatchInlineSnapshot(`
      "if (true) {
        console.log('asdf');
      }
      if (true) {
        console.log('asdf');
      }
      "
    `);
  });

  it('can join different lengths', async () => {
    const b = code`
      const a: ${joinCode([code`A`], { on: '|' })} = null!;
      const b: ${joinCode([code`B1`, code`B2`], { on: '|' })} = null!;
      const c: ${joinCode([], { on: '|' })} = null!;
      const d: ${joinCode([code`D1`, code`D2`, code`D3`, code`D4`], { on: '|' })} = null!;
    `;
    expect(await b.toStringWithImports()).toMatchInlineSnapshot(`
      "

            const a: A = null!;
            const b: B1|B2 = null!;
            const c:  = null!;
            const d: D1|D2|D3|D4 = null!;
          "
    `);
  });

  it('can format params', async () => {
    const params: Code[] = [];
    params.push(code`a: ${imp('Foo@foo')}`);
    params.push(code`b: string`);
    const b = code`function foo(${joinCode(params, { on: ',' })}) { return 1; }`;
    expect(await b.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Foo } from 'foo';

      function foo(a: Foo, b: string) {
        return 1;
      }
      "
    `);
  });

  it('can oneline code', async () => {
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
    expect(await c.toStringWithImports()).toMatchInlineSnapshot(`
      "const c = { a: { a: 1 }, b: 2 };
      const d = 3;
      "
    `);
  });

  it('can override prettier config code', async () => {
    const long = 'abcdefghijklmnopqrstuvwxyz';
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
    const o = await a.toStringWithImports({ prettierOverrides: { printWidth: 1_000 } });
    // Then it was not wrapped
    expect(o).toMatchInlineSnapshot(`
      "const a = { a: 'abcdefghijklmnopqrstuvwxyz', b: 'abcdefghijklmnopqrstuvwxyz', c: 'abcdefghijklmnopqrstuvwxyz', d: 'abcdefghijklmnopqrstuvwxyz' };
      "
    `);
  });
});
