import { ClassSpec } from '@src/ClassSpec';
import { CodeBlock } from '@src/CodeBlock';
import { DecoratorSpec } from '@src/DecoratorSpec';
import { FunctionSpec } from '@src/FunctionSpec';
import { Modifier } from '@src/Modifier';
import { PropertySpec } from '@src/PropertySpec';
import { TypeNames } from '@src/TypeNames';

const DataLoader = TypeNames.anyType('DataLoader=dataloader');
const Test2 = TypeNames.anyType('Test2');
const Test3 = TypeNames.anyType('Test3');
const Test4 = TypeNames.anyType('Test4');
const Test5 = TypeNames.anyType('Test5');
const Test6 = TypeNames.anyType('Test6');

describe('ClassSpec', () => {
  it('generates JavaDoc at before class definition', () => {
    const testClass = ClassSpec.create('Test').addJavadoc('this is a comment\n');
    expect(emit(testClass)).toMatchInlineSnapshot(`
"/**
 * this is a comment
 */
class Test {
}
"
`);
  });

  it('generates decorators formatted', () => {
    const testClass = ClassSpec.create('Test').addDecorator(
      DecoratorSpec.create('decorate')
        .addParameter('true')
        .addParameter('Test2')
    );
    expect(emit(testClass)).toMatchInlineSnapshot(`
"@decorate(
  true,
  Test2
)
class Test {
}
"
`);
  });

  it('generates modifiers in order', () => {
    const testClass = ClassSpec.create('Test').addModifiers(Modifier.ABSTRACT, Modifier.EXPORT);
    expect(emit(testClass)).toMatchInlineSnapshot(`
"export abstract class Test {
}
"
`);
  });

  it('generates type variables', () => {
    const testClass = ClassSpec.create('Test')
      .addTypeVariable(TypeNames.typeVariable('X', TypeNames.bound(Test2)))
      .addTypeVariable(TypeNames.typeVariable('Y', TypeNames.bound(Test3), TypeNames.intersectBound(Test4)))
      .addTypeVariable(TypeNames.typeVariable('Z', TypeNames.bound(Test5), TypeNames.unionBound(Test6, true)));
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test<X extends Test2, Y extends Test3 & Test4, Z extends Test5 | keyof Test6> {
}
"
`);
  });

  it('generates super class', () => {
    const testClass = ClassSpec.create('Test').superClass(Test2);
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test extends Test2 {
}
"
`);
  });

  it('generates implements', () => {
    const testClass = ClassSpec.create('Test')
      .addInterface(Test2)
      .addInterface(Test3);
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test implements Test2, Test3 {
}
"
`);
  });

  it('generates super class & implements properly formatted', () => {
    const testClass = ClassSpec.create('Test')
      .superClass(Test2)
      .addInterface(Test3)
      .addInterface(Test4);
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test extends Test2 implements Test3, Test4 {
}
"
`);
  });

  it('generates type vars, super class & implements properly formatted', () => {
    const testClass = ClassSpec.create('Test')
      .addTypeVariable(TypeNames.typeVariable('Y', TypeNames.bound(Test3), TypeNames.intersectBound(Test4)))
      .superClass(Test2)
      .addInterface(Test3)
      .addInterface(Test4);
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test<Y extends Test3 & Test4> extends Test2 implements Test3, Test4 {
}
"
`);
  });

  it('generates constructor', () => {
    const testClass = ClassSpec.create('Test').cstr(
      FunctionSpec.createConstructor().addParameter('value', TypeNames.NUMBER)
    );
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test {

  constructor(value: number) {
  }

}
"
`);
  });

  it('generates constructor with rest parameter', () => {
    const testClass = ClassSpec.create('Test').cstr(
      FunctionSpec.createConstructor()
        .addParameter('value', TypeNames.NUMBER)
        .rest('all', TypeNames.arrayType(TypeNames.STRING))
    );
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test {

  constructor(value: number, ...all: string[]) {
  }

}
"
`);
  });

  it('generates constructor with shorthand properties', () => {
    const testClass = ClassSpec.create('Test')
      .addProperty('value', TypeNames.NUMBER, { modifiers: [Modifier.PRIVATE] })
      .addProperty('value2', TypeNames.STRING, { modifiers: [Modifier.PUBLIC] })
      .addProperty('value3', TypeNames.BOOLEAN, { optional: true, modifiers: [Modifier.PUBLIC] })
      .cstr(
        FunctionSpec.createConstructor()
          .addParameter('value', TypeNames.NUMBER)
          .addParameter('value2', TypeNames.STRING)
          .addParameter('value3', TypeNames.BOOLEAN, { optional: true })
          .addCodeBlock(
            CodeBlock.empty()
              .add("const testing = 'need other code';\n")
              .addStatement('this.value = value')
              .addStatement('anotherTestStatement()')
              .addStatement('this.value2 = value2')
              .addStatement("this.value3 = value3 || testing == ''")
          )
      );
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test {

  value3?: boolean;

  constructor(private value: number, public value2: string, value3?: boolean) {
    const testing = 'need other code';
    anotherTestStatement();
    this.value3 = value3 || testing == '';
  }

}
"
`);
    // class Test {
    //
    //   value3?: boolean;
    //
    //   constructor(private value: number, public value2: string, value3?: boolean) {
    //     const testing = 'need other code'
    //     anotherTestStatement();
    //     this.value3 = value3 || testing == '';
    //   }
    //
    // }
  });

  it('generates property declarations', () => {
    const testClass = ClassSpec.create('Test')
      .addProperty('value', TypeNames.NUMBER, { modifiers: [Modifier.PRIVATE] })
      .addProperty('value2', TypeNames.STRING, { modifiers: [Modifier.PUBLIC] })
      .addProperty(PropertySpec.create('value3', TypeNames.BOOLEAN, false, Modifier.PUBLIC).initializer('true'))
      .addProperty(
        PropertySpec.create('value4', TypeNames.NUMBER, false, Modifier.PUBLIC).addDecorator(
          DecoratorSpec.create('limited')
            .addParameter('5')
            .addParameter('100')
        )
      )
      .addProperty(
        PropertySpec.create('value5', TypeNames.NUMBER, false, Modifier.PUBLIC).addDecorator(
          DecoratorSpec.create('dynamic')
        )
      )
      .addProperty(
        PropertySpec.create('value5', TypeNames.NUMBER, false, Modifier.PUBLIC).addDecorator(
          DecoratorSpec.create('logged').asFactory()
        )
      );
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test {

  private value: number;

  value2: string;

  value3: boolean = true;

  @limited(
    5,
    100
  )
  value4: number;

  @dynamic
  value5: number;

  @logged()
  value5: number;

}
"
`);
  });

  it('generates property declarations with initializers', () => {
    const testClass = ClassSpec.create('Test').addProperty(
      PropertySpec.create('loader', DataLoader.param('string', 'string'))
        .addModifiers(Modifier.PRIVATE)
        .setImplicitlyTyped()
        .initializerBlock(
          CodeBlock.empty().add(
            'new %L(%L)',
            DataLoader.param('string', 'string'),
            CodeBlock.lambda('keys').addStatement('return keys')
          )
        )
    );
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test {

  private loader = new DataLoader<string, string>((keys) => {
    return keys;
  });

}
"
`);
  });

  it('generates method definitions', () => {
    const testClass = ClassSpec.create('Test')
      .addFunction(FunctionSpec.create('test1').addCode(''))
      .addFunction(
        FunctionSpec.create('test2')
          .addCode('')
          .addDecorator(
            DecoratorSpec.create('validated')
              .addParameter('true')
              .addParameter('test2')
          )
      );
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test {

  test1() {
  }

  @validated(
    true,
    test2
  )
  test2() {
  }

}
"
`);
  });
});

function emit(spec: ClassSpec): string {
  return spec.toString();
}
