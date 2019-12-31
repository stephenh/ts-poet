import { code, imp } from '../src';

describe('code', () => {
  it('basic interpolation', () => {
    const foo = 'delicious';
    const a = code`${foo} taco`;
    expect(a.toString()).toEqual('delicious taco');
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

  it('can add imports symbols', () => {
    const b = code`
      class Foo extends ${imp('Bar@bar')} {}
    `;
    expect(b.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Bar } from \\"bar\\";
      
      class Foo extends Bar {}
      "
    `);
  });

  it('can nest codes', () => {
    const method1 = code`foo(): ${imp('Foo@foo')} { return "foo"; }`;
    const method2 = code`bar(): ${imp('Bar@bar')} { return "bar"; }`;
    const zaz = code`class Zaz { ${method1} ${method2} }`;
    expect(zaz.toStringWithImports()).toMatchInlineSnapshot(`
      "import { Bar } from \\"bar\\";
      import { Foo } from \\"foo\\";

      class Zaz {
        foo(): Foo {
          return \\"foo\\";
        }
        bar(): Bar {
          return \\"bar\\";
        }
      }
      "
    `);
  });
});
