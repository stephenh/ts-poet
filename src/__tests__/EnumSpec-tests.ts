import { EnumSpec } from '../EnumSpec';
import { Modifier } from '../Modifier';

describe('EnumSpec', () => {
  it('testGenJavaDoc', () => {
    const testClass = EnumSpec.create('Test').addJavadoc('this is a comment\n');
    expect(testClass.toString()).toMatchInlineSnapshot(`
"/**
 * this is a comment
 */
enum Test {
}
"
`);
  });

  it('testGenModifiersInOrder', () => {
    const testClass = EnumSpec.create('Test').addModifiers(Modifier.EXPORT);
    expect(testClass.toString()).toMatchInlineSnapshot(`
"export enum Test {
}
"
`);
  });

  it('testGenConstants', () => {
    const testClass = EnumSpec.create('Test')
      .addConstant('A', '10')
      .addConstant('B', '20')
      .addConstant('C', '30');
    expect(testClass.toString()).toMatchInlineSnapshot(`
"enum Test {
  A = 10,
  B = 20,
  C = 30,
}
"
`);
  });
});
