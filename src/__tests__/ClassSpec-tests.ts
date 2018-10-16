import { ClassSpec } from "../ClassSpec";
import { CodeBlock } from "../CodeBlock";
import { CodeWriter } from "../CodeWriter";
import { DecoratorSpec } from "../DecoratorSpec";
import { FunctionSpec } from "../FunctionSpec";
import { Modifier } from "../Modifier";
import { PropertySpec } from "../PropertySpec";
import { StringBuffer } from "../StringBuffer";
import { TypeNames } from "../TypeNames";

describe("ClassSpec", () => {
  it("generates JavaDoc at before class definition", () => {
    const testClass = ClassSpec.builder("Test")
      .addJavadoc("this is a comment\n")
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"/**
 * this is a comment
 */
class Test {

}
"
`);
  });

  it("generates decorators formatted", () => {
    const testClass = ClassSpec.builder("Test")
      .addDecorator(
        DecoratorSpec.builder("decorate")
          .addParameter(undefined, "true")
          .addParameter("targetType", "Test2")
          .build()
      )
      .build();
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

  it("generates modifiers in order", () => {
    const testClass = ClassSpec.builder("Test")
      .addModifiers(Modifier.ABSTRACT, Modifier.EXPORT)
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"export abstract class Test {

}
"
`);
  });

  it("generates type variables", () => {
    const testClass = ClassSpec.builder("Test")
      .addTypeVariable(TypeNames.typeVariable("X", TypeNames.bound("Test2")))
      .addTypeVariable(
        TypeNames.typeVariable(
          "Y",
          TypeNames.bound("Test3"),
          TypeNames.intersectBound("Test4")
        )
      )
      .addTypeVariable(
        TypeNames.typeVariable(
          "Z",
          TypeNames.bound("Test5"),
          TypeNames.unionBound("Test6", true)
        )
      )
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test<X extends Test2, Y extends Test3 & Test4, Z extends Test5 | keyof Test6> {

}
"
`);
  });

  it("generates super class", () => {
    const testClass = ClassSpec.builder("Test")
      .superClass(TypeNames.anyType("Test2"))
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test extends Test2 {

}
"
`);
  });

  it("generates mixins", () => {
    const testClass = ClassSpec.builder("Test")
      .addMixin(TypeNames.anyType("Test2"))
      .addMixin(TypeNames.anyType("Test3"))
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test implements Test2, Test3 {

}
"
`);
  });

  it("generates super class & mixins properly formatted", () => {
    const testClass = ClassSpec.builder("Test")
      .superClass(TypeNames.anyType("Test2"))
      .addMixin(TypeNames.anyType("Test3"))
      .addMixin(TypeNames.anyType("Test4"))
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test extends Test2 implements Test3, Test4 {

}
"
`);
  });

  it("generates type vars, super class & mixins properly formatted", () => {
    const testClass = ClassSpec.builder("Test")
      .addTypeVariable(
        TypeNames.typeVariable(
          "Y",
          TypeNames.bound("Test3"),
          TypeNames.intersectBound("Test4")
        )
      )
      .superClass(TypeNames.anyType("Test2"))
      .addMixin(TypeNames.anyType("Test3"))
      .addMixin(TypeNames.anyType("Test4"))
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test<Y extends Test3 & Test4> extends Test2 implements Test3, Test4 {

}
"
`);
  });

  it("generates constructor", () => {
    const testClass = ClassSpec.builder("Test")
      .cstr(
        FunctionSpec.constructorBuilder()
          .addParameter("value", TypeNames.NUMBER)
          .build()
      )
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test {

  constructor(value) {
  }

}
"
`);
    // class Test {
    //
    //   constructor(value: number) {
    //   }
    //
    // }
  });

  it("generates constructor with rest parameter", () => {
    const testClass = ClassSpec.builder("Test")
      .cstr(
        FunctionSpec.constructorBuilder()
          .addParameter("value", TypeNames.NUMBER)
          .rest("all", TypeNames.arrayType(TypeNames.STRING))
          .build()
      )
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test {

  constructor(value, all: Array<string>) {
  }

}
"
`);
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test {

  constructor(value, all: Array<string>) {
  }

}
"
`);
    // class Test {
    //
    //   constructor(value: number, ... all: Array<string>) {
    //   }
    //
    // }
  });

  it("generates constructor with shorthand properties", () => {
    const testClass = ClassSpec.builder("Test")
      .addProperty2("value", TypeNames.NUMBER, false, Modifier.PRIVATE)
      .addProperty2("value2", TypeNames.STRING, false, Modifier.PUBLIC)
      .addProperty2("value3", TypeNames.BOOLEAN, true, Modifier.PUBLIC)
      .cstr(
        FunctionSpec.constructorBuilder()
          .addParameter("value", TypeNames.NUMBER)
          .addParameter("value2", TypeNames.STRING)
          .addParameter("value3", TypeNames.BOOLEAN, true)
          .addCodeBlock(
            CodeBlock.builder()
              .add("const testing = 'need other code'; this.value = value\n")
              .addStatement("anotherTestStatement()")
              .addStatement("this.value2 = value2")
              .addStatement("this.value3 = value3 || testing == ''")
              .build()
          )
          .build()
      )
      .build();
    expect(emit(testClass)).toMatchInlineSnapshot(`
"class Test {

  private value: number;

  value2: string;

  value3?: boolean;

  constructor(value, value2, value3?) {
    const testing = 'need other code'; this.value = value
    anotherTestStatement();
    this.value2 = value2;
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

  it("generates property declarations", () => {
    const testClass = ClassSpec.builder("Test")
      .addProperty2("value", TypeNames.NUMBER, false, Modifier.PRIVATE)
      .addProperty2("value2", TypeNames.STRING, false, Modifier.PUBLIC)
      .addProperty(
        PropertySpec.builder(
          "value3",
          TypeNames.BOOLEAN,
          false,
          Modifier.PUBLIC
        )
          .initializer("true")
          .build()
      )
      .addProperty(
        PropertySpec.builder("value4", TypeNames.NUMBER, false, Modifier.PUBLIC)
          .addDecorator(
            DecoratorSpec.builder("limited")
              .addParameter("min", "5")
              .addParameter("max", "100")
              .build()
          )
          .build()
      )
      .addProperty(
        PropertySpec.builder("value5", TypeNames.NUMBER, false, Modifier.PUBLIC)
          .addDecorator(DecoratorSpec.builder("dynamic").build())
          .build()
      )
      .addProperty(
        PropertySpec.builder("value5", TypeNames.NUMBER, false, Modifier.PUBLIC)
          .addDecorator(
            DecoratorSpec.builder("logged")
              .asFactory()
              .build()
          )
          .build()
      )
      .build();
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
    // class Test {
    //
    //   private value: number;
    //
    //   value2: string;
    //
    //   value3: boolean = true;
    //
    //   @limited(
    //     /* min */ 5,
    //     /* max */ 100
    //   )
    //   value4: number;
    //
    //   @dynamic
    //   value5: number;
    //
    //   @logged()
    //   value5: number;
    //
    // }
  });

  it("generates method definitions", () => {
    const testClass = ClassSpec.builder("Test")
      .addFunction(
        FunctionSpec.builder("test1")
          .addCode("")
          .build()
      )
      .addFunction(
        FunctionSpec.builder("test2")
          .addDecorator(
            DecoratorSpec.builder("validated")
              .addParameter("strict", "true")
              .addParameter("name", "test2")
              .build()
          )
          .addCode("")
          .build()
      )
      .build();
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
    // class Test {
    //
    //   test1() {
    //   }
    //
    //   @validated(
    //     /* strict */ true,
    //     /* name */ test2
    //   )
    //   test2() {
    //   }
    //
    // }
  });

  it("ToBuilder copies all fields", () => {
    const testClassBlder = ClassSpec.builder("Test")
      .addJavadoc("this is a comment\n")
      .addDecorator(
        DecoratorSpec.builder("decorate")
          .addParameter(undefined, "true")
          .addParameter("targetType", "Test2")
          .build()
      )
      .addModifiers(Modifier.ABSTRACT, Modifier.EXPORT)
      .addTypeVariable(TypeNames.typeVariable("X", TypeNames.bound("Test2")))
      .superClass(TypeNames.anyType("Test2"))
      .addMixin(TypeNames.anyType("Test3"))
      .cstr(
        FunctionSpec.constructorBuilder()
          .addParameter("value", TypeNames.NUMBER)
          .build()
      )
      .addProperty2("value", TypeNames.NUMBER, false, Modifier.PRIVATE)
      .addProperty2("value2", TypeNames.STRING, false, Modifier.PUBLIC)
      .addFunction(
        FunctionSpec.builder("test1")
          .addCode("")
          .build()
      )
      .build()
      .toBuilder();
    // expect(testClassBlder.javaDoc.formatParts, hasItems("this is a comment\n"))
    // expect(testClassBlder.decorators.size, equalTo(1))
    // expect(testClassBlder.decorators[0].name, equalTo(SymbolSpec.from("decorate")))
    // expect(testClassBlder.decorators[0].parameters.size, equalTo(2))
    // expect(testClassBlder.modifiers.toImmutableSet(), equalTo(setOf(Modifier.ABSTRACT, Modifier.EXPORT)))
    // expect(testClassBlder.typeVariables.size, equalTo(1))
    // expect(testClassBlder.superClass, equalTo<TypeName>(
    //    TypeNames.anyType("Test2")))
    // expect(testClassBlder.mixins, hasItems<TypeName>(
    //    TypeNames.anyType("Test3")))
    // expect(testClassBlder.propertySpecs.map { it.name }, hasItems("value", "value2"))
    // expect(testClassBlder.constructor, notNullValue())
    // expect(testClassBlder.functionSpecs.map { it.name }, hasItems("test1"))
  });
});

function emit(spec: ClassSpec): string {
  const out = new StringBuffer();
  spec.emit(new CodeWriter(out));
  return out.toString();
}
