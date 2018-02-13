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

package io.outfoxx.typescriptpoet.test

import io.outfoxx.typescriptpoet.*
import org.hamcrest.CoreMatchers.equalTo
import org.hamcrest.CoreMatchers.hasItems
import org.hamcrest.MatcherAssert.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.io.StringWriter


@DisplayName("FunctionSpec Tests")
class FunctionSpecTests {

  @Test
  @DisplayName("Generates JavaDoc at before class definition")
  fun testGenJavaDoc() {
    val testFunc = FunctionSpec.builder("test")
       .addJavadoc("this is a comment\n")
       .build()

    val out = StringWriter()
    testFunc.emit(CodeWriter(out), null, setOf())

    assertThat(
       out.toString(),
       equalTo(
          """
            /**
             * this is a comment
             */
            function test() {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates decorators formatted")
  fun testGenDecorators() {
    val testFunc = FunctionSpec.builder("test")
       .addDecorator(
          DecoratorSpec.builder("decorate")
             .addParameter(null, "true")
             .addParameter("targetType", "Test2")
             .build()
       )
       .build()

    val out = StringWriter()
    testFunc.emit(CodeWriter(out), null, setOf())

    assertThat(
       out.toString(),
       equalTo(
          """
            @decorate(
              true,
              /* targetType */ Test2
            )
            function test() {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates modifiers in order")
  fun testGenModifiersInOrder() {
    val testClass = FunctionSpec.builder("test")
       .addModifiers(Modifier.PRIVATE, Modifier.GET, Modifier.EXPORT)
       .addCode("")
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out), null, setOf())

    assertThat(
       out.toString(),
       equalTo(
          """
            export private get function test() {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates no block when abstract")
  fun testGenModifiersAbstract() {
    val testClass = FunctionSpec.builder("test")
       .addModifiers(Modifier.PRIVATE, Modifier.ABSTRACT)
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out), null, setOf())

    assertThat(
       out.toString(),
       equalTo(
          """
            private abstract function test();

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates type variables")
  fun testGenTypeVars() {
    val testClass = FunctionSpec.builder("test")
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
    testClass.emit(CodeWriter(out), null, setOf())

    assertThat(
       out.toString(),
       equalTo(
          """
            function test<X extends Test2, Y extends Test3 & Test4, Z extends Test5 | keyof Test6>() {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates return type")
  fun testGenReturnType() {
    val testClass = FunctionSpec.builder("test")
       .returns(TypeName.anyType("Value"))
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out), null, setOf())

    assertThat(
       out.toString(),
       equalTo(
          """
            function test(): Value {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates no return type when void")
  fun testGenNoReturnTypeForVoid() {
    val testClass = FunctionSpec.builder("test")
       .returns(TypeName.VOID)
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out), null, setOf())

    assertThat(
       out.toString(),
       equalTo(
          """
            function test() {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates no return type when not set")
  fun testGenNoReturnType() {
    val testClass = FunctionSpec.builder("test")
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out), null, setOf())

    assertThat(
       out.toString(),
       equalTo(
          """
            function test() {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates parameters")
  fun testGenParameters() {
    val testClass = FunctionSpec.builder("test")
       .addParameter("b", TypeName.STRING)
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out), null, setOf())

    assertThat(
       out.toString(),
       equalTo(
          """
            function test(b: string) {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates parameters with rest")
  fun testGenParametersRest() {
    val testClass = FunctionSpec.builder("test")
       .addParameter("b", TypeName.STRING)
       .restParameter("c", TypeName.arrayType(TypeName.STRING))
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out), null, setOf())

    assertThat(
       out.toString(),
       equalTo(
          """
            function test(b: string, ... c: Array<string>) {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates parameters with default values")
  fun testGenParametersDefaults() {
    val testClass = FunctionSpec.builder("test")
       .addParameter("a", TypeName.NUMBER, false, CodeBlock.of("10"))
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out), null, setOf())

    assertThat(
       out.toString(),
       equalTo(
          """
            function test(a: number = 10) {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates parameter decorators")
  fun testGenParameterDecorators() {
    val testClass = FunctionSpec.builder("test")
       .addParameter(
          ParameterSpec.builder("a", TypeName.NUMBER)
             .addDecorator(
                DecoratorSpec.builder("required")
                   .build()
             )
             .addDecorator(
                DecoratorSpec.builder("size")
                   .addParameter("min", "10")
                   .addParameter("max", "100")
                   .build()
             )
             .addDecorator(
                DecoratorSpec.builder("logged")
                   .asFactory()
                   .build()
             )
             .build()
       )
       .build()

    val out = StringWriter()
    testClass.emit(CodeWriter(out), null, setOf())

    assertThat(
       out.toString(),
       equalTo(
          """
            function test(@required @size(/* min */ 10, /* max */ 100) @logged() a: number) {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("toBuilder copies all fields")
  fun testToBuilder() {
    val testFuncBlder = FunctionSpec.builder("Test")
       .addJavadoc("this is a comment\n")
       .addDecorator(
          DecoratorSpec.builder("decorate")
             .addParameter(null, "true")
             .addParameter("targetType", "Test2")
             .build()
       )
       .addModifiers(Modifier.EXPORT)
       .addTypeVariable(
          TypeName.typeVariable("X", TypeName.bound("Test2"))
       )
       .addCode("val;\n")
       .build()
       .toBuilder()

    assertThat(testFuncBlder.javaDoc.formatParts, hasItems("this is a comment\n"))
    assertThat(testFuncBlder.decorators.size, equalTo(1))
    assertThat(testFuncBlder.decorators[0].name, equalTo(SymbolSpec.from("decorate")))
    assertThat(testFuncBlder.decorators[0].parameters.size, equalTo(2))
    assertThat(testFuncBlder.modifiers.toImmutableSet(), equalTo(setOf(Modifier.EXPORT)))
    assertThat(testFuncBlder.typeVariables.size, equalTo(1))
    assertThat(testFuncBlder.body.formatParts, hasItems("val;\n"))
  }

}
