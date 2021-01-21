import { arrayOf, Code, code, conditionalOutput, def, imp, joinCode } from '../src';

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
    const obj = { a: 1, b: false };
    const zaz = code`const foo = ${obj}`;
    expect(await zaz.toStringWithImports()).toEqual('const foo = { a: 1, b: false };\n');
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
    const methods = [method1, method2];
    const zaz = code`class Zaz { ${[methods]} }`;
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
});
