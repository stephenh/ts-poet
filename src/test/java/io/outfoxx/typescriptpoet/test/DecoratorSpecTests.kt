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

import io.outfoxx.typescriptpoet.CodeBlock
import io.outfoxx.typescriptpoet.CodeWriter
import io.outfoxx.typescriptpoet.DecoratorSpec
import io.outfoxx.typescriptpoet.SymbolSpec
import org.hamcrest.CoreMatchers.equalTo
import org.hamcrest.CoreMatchers.hasItems
import org.hamcrest.MatcherAssert.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.io.StringWriter


@DisplayName("DecoratorSpec Tests")
class DecoratorSpecTests {

  @Test
  @DisplayName("Generate inline")
  fun testGenInline() {
    val testDec = DecoratorSpec.builder("test")
       .addParameter("value", "100")
       .addParameter("value2", "20")
       .build()

    val out = StringWriter()
    testDec.emit(CodeWriter(out), inline = true)

    assertThat(
       out.toString(),
       equalTo(
          """
            @test(/* value */ 100, /* value2 */ 20)
          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generate expanded")
  fun testGenExpanded() {
    val testDec = DecoratorSpec.builder("test")
       .addParameter("value", "100")
       .addParameter("value2", "20")
       .build()

    val out = StringWriter()
    testDec.emit(CodeWriter(out), inline = false)

    assertThat(
       out.toString(),
       equalTo(
          """
            @test(
              /* value */ 100,
              /* value2 */ 20
            )
          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generate with no-argument")
  fun testGenNoArg() {
    val testDec = DecoratorSpec.builder("test")
       .build()

    val out = StringWriter()
    testDec.emit(CodeWriter(out), inline = false)

    assertThat(
       out.toString(),
       equalTo(
          """
            @test
          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generate factory with no-argument")
  fun testGenNoArgFactory() {
    val testDec = DecoratorSpec.builder("test")
       .asFactory()
       .build()

    val out = StringWriter()
    testDec.emit(CodeWriter(out), inline = false)

    assertThat(
       out.toString(),
       equalTo(
          """
            @test()
          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("toBuilder copies all fields")
  fun testToBuilder() {
    val testDecBldr = DecoratorSpec.builder("test")
       .addParameter("value", "100")
       .addParameter("value2", "20")
       .asFactory()
       .build()
       .toBuilder()

    assertThat(testDecBldr.name, equalTo(SymbolSpec.from("test")))
    assertThat(testDecBldr.parameters, hasItems<Pair<String?, CodeBlock>>(Pair("value", CodeBlock.of("100")), Pair("value2", CodeBlock.of("20"))))
    assertThat(testDecBldr.factory, equalTo(true))
  }

}
