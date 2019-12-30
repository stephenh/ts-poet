import { CodeBlock } from '@src/CodeBlock';
import { DecoratorSpec } from '@src/DecoratorSpec';
import { FunctionSpec } from '@src/FunctionSpec';
import { Modifier } from '@src/Modifier';
import { ParameterSpec } from '@src/ParameterSpec';
import { TypeNames as TypeName } from '@src/TypeNames';

const Test2 = TypeName.anyType('Test2');
const Test3 = TypeName.anyType('Test3');
const Test4 = TypeName.anyType('Test4');
const Test5 = TypeName.anyType('Test5');
const Test6 = TypeName.anyType('Test6');

describe('FunctionSpec', () => {
  it('generates JavaDoc at before class definition', () => {
    const testFunc = FunctionSpec.create('test').addJavadoc('this is a comment\n');
    expect(emit(testFunc)).toMatchInlineSnapshot(`
"/**
 * this is a comment
 */
function test() {
}
"
`);
  });

  it('generates decorators formatted', () => {
    const testFunc = FunctionSpec.create('test').addDecorator(
      DecoratorSpec.create('decorate')
        .addParameter('true')
        .addParameter('Test2')
    );
    expect(emit(testFunc)).toMatchInlineSnapshot(`
"@decorate(
  true,
  Test2
)
function test() {
}
"
`);
  });

  it('generates decorators with string overload', () => {
    const testFunc = FunctionSpec.create('test').addDecorator('decorate');
    expect(emit(testFunc)).toMatchInlineSnapshot(`
"@decorate
function test() {
}
"
`);
  });

  it('generates modifiers in order', () => {
    const testClass = FunctionSpec.create('test')
      .addModifiers(Modifier.PRIVATE, Modifier.GET, Modifier.EXPORT)
      .addCode('');
    expect(emit(testClass)).toMatchInlineSnapshot(`
"export private get function test() {
}
"
`);
  });

  it('generates async modifier', () => {
    const testClass = FunctionSpec.create('test')
      .addModifiers(Modifier.EXPORT, Modifier.ASYNC)
      .addCode('');
    expect(emit(testClass)).toMatchInlineSnapshot(`
"export async function test() {
}
"
`);
  });

  it('generates no block when abstract', () => {
    const testClass = FunctionSpec.create('test').addModifiers(Modifier.PRIVATE, Modifier.ABSTRACT);
    expect(emit(testClass)).toMatchInlineSnapshot(`
"private abstract function test();
"
`);
  });

  it('generates type variables', () => {
    const testClass = FunctionSpec.create('test')
      .addTypeVariable(TypeName.typeVariable('X', TypeName.bound(Test2)))
      .addTypeVariable(TypeName.typeVariable('Y', TypeName.bound(Test3), TypeName.intersectBound(Test4)))
      .addTypeVariable(TypeName.typeVariable('Z', TypeName.bound(Test5), TypeName.unionBound(Test6, true)));
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test<X extends Test2, Y extends Test3 & Test4, Z extends Test5 | keyof Test6>() {
}
"
`);
  });

  it('generates return type', () => {
    const testClass = FunctionSpec.create('test').returns(TypeName.anyType('Value'));
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test(): Value {
}
"
`);
  });

  it('generates no return type when void', () => {
    const testClass = FunctionSpec.create('test').returns(TypeName.VOID);
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test() {
}
"
`);
  });

  it('generates no return type when not set', () => {
    const testClass = FunctionSpec.create('test');
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test() {
}
"
`);
  });

  it('generates parameters', () => {
    const testClass = FunctionSpec.create('test').addParameter('b', TypeName.STRING);
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test(b: string) {
}
"
`);
  });

  it('generates parameters with string overload', () => {
    const testClass = FunctionSpec.create('test').addParameter('b', 'number');
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test(b: number) {
}
"
`);
  });

  it('generates parameters with rest', () => {
    const testClass = FunctionSpec.create('test')
      .addParameter('b', TypeName.STRING)
      .rest('c', TypeName.arrayType(TypeName.STRING));
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test(b: string, ...c: string[]) {
}
"
`);
  });

  it('generates parameters with rest with string overload', () => {
    const testClass = FunctionSpec.create('test').rest('c', 'string[]');
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test(...c: string[]) {
}
"
`);
  });

  it('generates parameters with default values', () => {
    const testClass = FunctionSpec.create('test').addParameter('a', TypeName.NUMBER, {
      defaultValueField: CodeBlock.of('10'),
    });
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test(a: number = 10) {
}
"
`);
  });

  it('generates parameter decorators', () => {
    const testClass = FunctionSpec.create('test').addParameter(
      ParameterSpec.create('a', TypeName.NUMBER)
        .addDecorator('required')
        .addDecorator(
          DecoratorSpec.create('size')
            .addParameter('10')
            .addParameter('100')
        )
        .addDecorator(DecoratorSpec.create('logged').asFactory())
    );
    expect(emit(testClass)).toMatchInlineSnapshot(`
"function test(@required @size(10, 100) @logged() a: number) {
}
"
`);
  });
});

function emit(spec: FunctionSpec): string {
  return spec.toString();
}
