import { arrayOf, code, def, imp } from '../src';

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

  it('can use symbols', () => {
    const b = code`
      class Foo extends ${imp('Bar@bar')} {}
    `;
    expect(b.toString()).toMatchInlineSnapshot(`
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
    expect(await zaz.toStringWithImports('./zaz/Zaz')).toMatchInlineSnapshot(`
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
    expect(await b.toStringWithImports('foo.ts')).toMatchInlineSnapshot(`
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
    let Foo = imp('Foo@./index');
    // And we know that it's actually defined in ./foo
    Foo.definedIn = './foo';
    // When we use the Foo@./index type within ./foo itself
    const b = code`
      const ${def('Foo')} = {};
      const f1 = new ${Foo}();
      const f2 = new ${imp('Foo@./bar')}();
    `;
    // Then we don't need an import for f1
    expect(await b.toStringWithImports('foo.ts')).toMatchInlineSnapshot(`
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
});
