/*
 * Copyright 2017 Outfox, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package io.outfox.typescriptpoet.test

import io.outfox.typescriptpoet.*
import org.hamcrest.CoreMatchers.*
import org.hamcrest.MatcherAssert.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.io.StringWriter


@DisplayName("ClassSpec Tests")
class ClassSpecTests {

  @Test
  @DisplayName("Generates JavaDoc at before class definition")
  fun testGenJavaDoc() {
    val testClass = ClassSpec.builder("Test")
       .addJavadoc("this is a comment\n")
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            /**
             * this is a comment
             */
            class Test {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates decorators formatted")
  fun testGenDecorators() {
    val testClass = ClassSpec.builder("Test")
       .addDecorator(
          DecoratorSpec.builder("decorate")
             .addParameter(null, "true")
             .addParameter("targetType", "Test2")
             .build()
       )
       .build()
    val out = StringWriter()
    testClass.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            @decorate(
              true,
              /* targetType */ Test2
            )
            class Test {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates modifiers in order")
  fun testGenModifiersInOrder() {
    val testClass = ClassSpec.builder("Test")
       .addModifiers(Modifier.ABSTRACT, Modifier.EXPORT)
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            export abstract class Test {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates type variables")
  fun testGenTypeVars() {
    val testClass =           ClassSpec.builder("Test")
             .addTypeVariable(
                TypeName.typeVariable("X", TypeName.bound("Test2"))
             )
             .addTypeVariable(
                TypeName.typeVariable("Y", TypeName.bound("Test3"), TypeName.intersectBound("Test4"))
             )
             .addTypeVariable(
                TypeName.typeVariable("Z", TypeName.bound("Test5"), TypeName.unionBound("Test6", true))
             )
             .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            class Test<X extends Test2, Y extends Test3 & Test4, Z extends Test5 | keyof Test6> {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates super class")
  fun testGenSuperClass() {
    val testClass = ClassSpec.builder("Test")
       .superClass(TypeName.anyType("Test2"))
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            class Test extends Test2 {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates mixins")
  fun testGenMixins() {
    val testClass = ClassSpec.builder("Test")
       .addMixin(TypeName.anyType("Test2"))
       .addMixin(TypeName.anyType("Test3"))
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            class Test implements Test2, Test3 {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates super class & mixins properly formatted")
  fun testGenSuperClassAndMixinsFormatted() {
    val testClass = ClassSpec.builder("Test")
       .superClass(TypeName.anyType("Test2"))
       .addMixin(TypeName.anyType("Test3"))
       .addMixin(TypeName.anyType("Test4"))
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            class Test extends Test2 implements Test3, Test4 {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates type vars, super class & mixins properly formatted")
  fun testGenTypeVarsAndSuperClassAndMixinsFormatted() {
    val testClass = ClassSpec.builder("Test")
       .addTypeVariable(
          TypeName.typeVariable("Y", TypeName.bound("Test3"), TypeName.intersectBound("Test4"))
       )
       .superClass(TypeName.anyType("Test2"))
       .addMixin(TypeName.anyType("Test3"))
       .addMixin(TypeName.anyType("Test4"))
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            class Test<Y extends Test3 & Test4> extends Test2 implements Test3, Test4 {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates constructor")
  fun testGenConstructor() {
    val testClass = ClassSpec.builder("Test")
       .constructor(
          FunctionSpec.constructorBuilder()
             .addParameter("value", TypeName.NUMBER)
             .build()
       )
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            class Test {

              constructor(value: number) {
              }

            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates constructor with rest parameter")
  fun testGenConstructorRest() {
    val testClass = ClassSpec.builder("Test")
       .constructor(
          FunctionSpec.constructorBuilder()
             .addParameter("value", TypeName.NUMBER)
             .restParameter("all", TypeName.arrayType(TypeName.STRING))
             .build()
       )
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            class Test {

              constructor(value: number, ... all: Array<string>) {
              }

            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates constructor with shorthand properties")
  fun testGenConstructorShorthandProperties() {
    val testClass = ClassSpec.builder("Test")
       .addProperty("value", TypeName.NUMBER, false, Modifier.PRIVATE)
       .addProperty("value2", TypeName.STRING, false, Modifier.PUBLIC)
       .addProperty("value3", TypeName.BOOLEAN, true, Modifier.PUBLIC)
       .constructor(
          FunctionSpec.constructorBuilder()
             .addParameter("value", TypeName.NUMBER)
             .addParameter("value2", TypeName.STRING)
             .addParameter("value3", TypeName.BOOLEAN, true)
             .addCode(
                CodeBlock.builder()
                   .add("val testing = 'need other code'; this.value = value\n")
                   .addStatement("anotherTestStatement()")
                   .addStatement("this.value2 = value2")
                   .addStatement("this.value3 = value3 || testing == ''")
                   .build()
             )
             .build()
       )
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            class Test {

              value3?: boolean;

              constructor(private value: number, public value2: string, value3?: boolean) {
                val testing = 'need other code'
                anotherTestStatement();
                this.value3 = value3 || testing == '';
              }

            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates property declarations")
  fun testGenProperties() {
    val testClass = ClassSpec.builder("Test")
       .addProperty("value", TypeName.NUMBER, false, Modifier.PRIVATE)
       .addProperty("value2", TypeName.STRING, false, Modifier.PUBLIC)
       .addProperty(
          PropertySpec.builder("value3", TypeName.BOOLEAN, false, Modifier.PUBLIC)
             .initializer("true")
             .build()
       )
       .addProperty(
          PropertySpec.builder("value4", TypeName.NUMBER, false, Modifier.PUBLIC)
             .addDecorator(
                DecoratorSpec.builder("limited")
                   .addParameter("min", "5")
                   .addParameter("max", "100")
                   .build()
             )
             .build()
       )
       .addProperty(
          PropertySpec.builder("value5", TypeName.NUMBER, false, Modifier.PUBLIC)
             .addDecorator(
                DecoratorSpec.builder("dynamic")
                   .build()
             )
             .build()
       )
       .addProperty(
          PropertySpec.builder("value5", TypeName.NUMBER, false, Modifier.PUBLIC)
             .addDecorator(
                DecoratorSpec.builder("logged")
                   .asFactory()
                   .build()
             )
             .build()
       )
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            class Test {

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

          """.trimIndent()
       )
    )
  }


  @Test
  @DisplayName("Generates method definitions")
  fun testGenMethods() {
    val testClass = ClassSpec.builder("Test")
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
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            class Test {

              test1() {
              }

              @validated(
                /* strict */ true,
                /* name */ test2
              )
              test2() {
              }

            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("toBuilder copies all fields")
  fun testToBuilder() {
    val testClassBlder = ClassSpec.builder("Test")
       .addJavadoc("this is a comment\n")
       .addDecorator(
          DecoratorSpec.builder("decorate")
             .addParameter(null, "true")
             .addParameter("targetType", "Test2")
             .build()
       )
       .addModifiers(Modifier.ABSTRACT, Modifier.EXPORT)
       .addTypeVariable(
          TypeName.typeVariable("X", TypeName.bound("Test2"))
       )
       .superClass(TypeName.anyType("Test2"))
       .addMixin(TypeName.anyType("Test3"))
       .constructor(
          FunctionSpec.constructorBuilder()
             .addParameter("value", TypeName.NUMBER)
             .build()
       )
       .addProperty("value", TypeName.NUMBER, false, Modifier.PRIVATE)
       .addProperty("value2", TypeName.STRING, false, Modifier.PUBLIC)
       .addFunction(
          FunctionSpec.builder("test1")
             .addCode("")
             .build()
       )
       .build()
       .toBuilder()

    assertThat(testClassBlder.javaDoc.formatParts, hasItems("this is a comment\n"))
    assertThat(testClassBlder.decorators.size, equalTo(1))
    assertThat(testClassBlder.decorators[0].name, equalTo(SymbolSpec.from("decorate")))
    assertThat(testClassBlder.decorators[0].parameters.size, equalTo(2))
    assertThat(testClassBlder.modifiers.toImmutableSet(), equalTo(setOf(Modifier.ABSTRACT, Modifier.EXPORT)))
    assertThat(testClassBlder.typeVariables.size, equalTo(1))
    assertThat(testClassBlder.superClass, equalTo<TypeName>(TypeName.anyType("Test2")))
    assertThat(testClassBlder.mixins, hasItems<TypeName>(TypeName.anyType("Test3")))
    assertThat(testClassBlder.propertySpecs.map { it.name }, hasItems("value", "value2"))
    assertThat(testClassBlder.constructor, notNullValue())
    assertThat(testClassBlder.functionSpecs.map { it.name }, hasItems("test1"))
  }

}
