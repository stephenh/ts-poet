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

import io.outfox.typescriptpoet.*
import io.outfoxx.typescriptpoet.*
import org.hamcrest.CoreMatchers.equalTo
import org.hamcrest.CoreMatchers.hasItems
import org.hamcrest.MatcherAssert.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.io.StringWriter


@DisplayName("InterfaceSpec Tests")
class InterfaceSpecTests {

  @Test
  @DisplayName("Generates JavaDoc at before interface definition")
  fun testGenJavaDoc() {
    val testIface = InterfaceSpec.builder("Test")
       .addJavadoc("this is a comment\n")
       .build()

    val out = StringWriter()
    testIface.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            /**
             * this is a comment
             */
            interface Test {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates modifiers in order")
  fun testGenModifiersInOrder() {
    val testIface = InterfaceSpec.builder("Test")
       .addModifiers(Modifier.EXPORT)
       .build()

    val out = StringWriter()
    testIface.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            export interface Test {
            }

          """.trimIndent()
       )
    )
  }


  @Test
  @DisplayName("Generates type variables")
  fun testGenTypeVars() {
    val testIface =           InterfaceSpec.builder("Test")
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
    testIface.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            interface Test<X extends Test2, Y extends Test3 & Test4, Z extends Test5 | keyof Test6> {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates super interfaces")
  fun testGenMixins() {
    val testIface = InterfaceSpec.builder("Test")
       .addSuperInterface(TypeName.anyType("Test2"))
       .addSuperInterface(TypeName.anyType("Test3"))
       .build()

    val out = StringWriter()
    testIface.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            interface Test extends Test2, Test3 {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates type vars & super interfaces properly formatted")
  fun testGenTypeVarsAndSuperInterfacesFormatted() {
    val testIface = InterfaceSpec.builder("Test")
       .addTypeVariable(
          TypeName.typeVariable("Y", TypeName.bound("Test3"), TypeName.intersectBound("Test4"))
       )
       .addSuperInterface(TypeName.anyType("Test2"))
       .addSuperInterface(TypeName.anyType("Test3"))
       .addSuperInterface(TypeName.anyType("Test4"))
       .build()

    val out = StringWriter()
    testIface.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            interface Test<Y extends Test3 & Test4> extends Test2, Test3, Test4 {
            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates property declarations")
  fun testGenProperties() {
    val testIface = InterfaceSpec.builder("Test")
       .addProperty("value", TypeName.NUMBER, false, Modifier.PRIVATE)
       .addProperty("value2", TypeName.STRING, true, Modifier.PUBLIC)
       .build()

    val out = StringWriter()
    testIface.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            interface Test {

              private value: number;

              value2?: string;

            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates method declarations")
  fun testGenMethods() {
    val testIface = InterfaceSpec.builder("Test")
       .addFunction(
          FunctionSpec.builder("test1")
             .addModifiers(Modifier.ABSTRACT)
             .build()
       )
       .addFunction(
          FunctionSpec.builder("test2")
             .addModifiers(Modifier.ABSTRACT)
             .build()
       )
       .build()

    val out = StringWriter()
    testIface.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            interface Test {

              test1();

              test2();

            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates indexing declarations")
  fun testGenIndexables() {
    val testIface = InterfaceSpec.builder("Test")
       .addIndexable(
          FunctionSpec.indexableBuilder()
             .addModifiers(Modifier.ABSTRACT)
             .addParameter("idx", TypeName.STRING)
             .returns(TypeName.ANY)
             .build()
       )
       .addIndexable(
          FunctionSpec.indexableBuilder()
             .addModifiers(Modifier.READONLY, Modifier.ABSTRACT)
             .addParameter("idx", TypeName.STRING)
             .returns(TypeName.ANY)
             .build()
       )
       .build()

    val out = StringWriter()
    testIface.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            interface Test {

              [idx: string]: any;

              readonly [idx: string]: any;

            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates callable declaration")
  fun testGenCallable() {
    val testIface = InterfaceSpec.builder("Test")
       .callable(
          FunctionSpec.callableBuilder()
             .addModifiers(Modifier.ABSTRACT)
             .addParameter("a", TypeName.STRING)
             .returns(TypeName.anyType("Test"))
             .build()
       )
       .build()

    val out = StringWriter()
    testIface.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            interface Test {

              (a: string): Test;

            }

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("toBuilder copies all fields")
  fun testToBuilder() {
    val testIfaceBlder = InterfaceSpec.builder("Test")
       .addJavadoc("this is a comment\n")
       .addModifiers(Modifier.ABSTRACT, Modifier.EXPORT)
       .addTypeVariable(
          TypeName.typeVariable("X", TypeName.bound("Test2"))
       )
       .addSuperInterface(TypeName.anyType("Test3"))
       .addProperty("value", TypeName.NUMBER, false, Modifier.PRIVATE)
       .addProperty("value2", TypeName.STRING, false, Modifier.PUBLIC)
       .addFunction(
          FunctionSpec.builder("test1")
             .addModifiers(Modifier.ABSTRACT)
             .build()
       )
       .addIndexable(
          FunctionSpec.indexableBuilder()
             .addModifiers(Modifier.ABSTRACT)
             .addParameter("idx", TypeName.STRING)
             .returns(TypeName.ANY)
             .build()
       )
       .callable(
          FunctionSpec.callableBuilder()
             .addModifiers(Modifier.ABSTRACT)
             .build()
       )
       .build()
       .toBuilder()

    assertThat(testIfaceBlder.javaDoc.formatParts, hasItems("this is a comment\n"))
    assertThat(testIfaceBlder.modifiers.toImmutableSet(), equalTo(setOf(Modifier.ABSTRACT, Modifier.EXPORT)))
    assertThat(testIfaceBlder.typeVariables.size, equalTo(1))
    assertThat(testIfaceBlder.superInterfaces, hasItems<TypeName>(
       TypeName.anyType("Test3")))
    assertThat(testIfaceBlder.propertySpecs.map { it.name }, hasItems("value", "value2"))
    assertThat(testIfaceBlder.functionSpecs.map { it.name }, hasItems("test1"))
    assertThat(testIfaceBlder.indexableSpecs.map { it.name }, hasItems("indexable()"))
    assertThat(testIfaceBlder.callable?.name, equalTo("callable()"))
  }

}
