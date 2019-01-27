import { ClassSpec } from '../ClassSpec';
import { CodeBlock } from '../CodeBlock';
import { DecoratorSpec } from '../DecoratorSpec';
import { FunctionSpec } from '../FunctionSpec';
import { Modifier } from '../Modifier';
import { PropertySpec } from '../PropertySpec';
import { TypeNames } from '../TypeNames';

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
        .addParameter(undefined, 'true')
        .addParameter('targetType', 'Test2')
    );
    expect(emit(testClass)).toMatchInlineSnapshot(`
"@decorate(
  true,
  /* targetType */ Test2
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
      .addTypeVariable(TypeNames.typeVariable('X', TypeNames.bound('Test2')))
      .addTypeVariable(TypeNames.typeVariable('Y', TypeNames.bound('Test3'), TypeNames.intersectBound('Test4')))
      .addTypeVariable(TypeNames.typeVariable('Z', TypeNames.bound('Test5'), TypeNames.unionBound('Test6', true)));
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test<X extends Test2, Y extends Test3 & Test4, Z extends Test5 | keyof Test6> {
}
"
`);
  });

  it('generates super class', () => {
    const testClass = ClassSpec.create('Test').superClass('Test2');
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test extends Test2 {
}
"
`);
  });

  it('generates mixins', () => {
    const testClass = ClassSpec.create('Test')
      .addMixin('Test2')
      .addMixin('Test3');
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test implements Test2, Test3 {
}
"
`);
  });

  it('generates super class & mixins properly formatted', () => {
    const testClass = ClassSpec.create('Test')
      .superClass('Test2')
      .addMixin('Test3')
      .addMixin('Test4');
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test extends Test2 implements Test3, Test4 {
}
"
`);
  });

  it('generates type vars, super class & mixins properly formatted', () => {
    const testClass = ClassSpec.create('Test')
      .addTypeVariable(TypeNames.typeVariable('Y', TypeNames.bound('Test3'), TypeNames.intersectBound('Test4')))
      .superClass('Test2')
      .addMixin('Test3')
      .addMixin('Test4');
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test<Y extends Test3 & Test4> extends Test2 implements Test3, Test4 {
}
"
`);
  });

  it('generates constructor', () => {
    const testClass = ClassSpec.create('Test').cstr(
      FunctionSpec.constructorBuilder().addParameter('value', TypeNames.NUMBER)
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
      FunctionSpec.constructorBuilder()
        .addParameter('value', TypeNames.NUMBER)
        .rest('all', TypeNames.arrayType(TypeNames.STRING))
    );
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test {

  constructor(value: number, ...all: Array<string>) {
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
        FunctionSpec.constructorBuilder()
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
            .addParameter('min', '5')
            .addParameter('max', '100')
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
    /* min */ 5,
    /* max */ 100
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

  it('generates method definitions', () => {
    const testClass = ClassSpec.create('Test')
      .addFunction(FunctionSpec.create('test1').addCode(''))
      .addFunction(
        FunctionSpec.create('test2')
          .addCode('')
          .addDecorator(
            DecoratorSpec.create('validated')
              .addParameter('strict', 'true')
              .addParameter('name', 'test2')
          )
      );
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test {

  test1() {
  }

  @validated(
    /* strict */ true,
    /* name */ test2
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
