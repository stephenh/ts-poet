import { CodeWriter } from '@src/CodeWriter';
import { DecoratorSpec } from '@src/DecoratorSpec';
import { StringBuffer } from '@src/StringBuffer';

describe('DecoratorSpec', () => {
  it('generate inline', () => {
    const testDec = DecoratorSpec.create('test')
      .addParameter('100')
      .addParameter('120');
    expect(emit(testDec, true)).toMatchInlineSnapshot(`"@test(100, 120)"`);
  });

  it('generate expanded', () => {
    const testDec = DecoratorSpec.create('test')
      .addParameter('100')
      .addParameter('20');
    expect(emit(testDec)).toMatchInlineSnapshot(`
"@test(
  100,
  20
)"
`);
  });

  it('generate with no-argument', () => {
    const testDec = DecoratorSpec.create('test');
    expect(emit(testDec)).toMatchInlineSnapshot(`"@test"`);
  });

  it('generate factory with no-argument', () => {
    const testDec = DecoratorSpec.create('test').asFactory();
    expect(emit(testDec)).toMatchInlineSnapshot(`"@test()"`);
  });
});

function emit(spec: DecoratorSpec, inline: boolean = false): string {
  const out = new StringBuffer();
  spec.emit(new CodeWriter(out), inline);
  return out.toString();
}
