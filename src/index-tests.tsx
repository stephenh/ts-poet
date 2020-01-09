import { arrayOf, code, imp } from '../src';

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
