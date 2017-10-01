package io.outfox.typescriptpoet.test

import io.outfox.typescriptpoet.CodeWriter
import io.outfox.typescriptpoet.Modifier
import io.outfox.typescriptpoet.TypeAliasSpec
import io.outfox.typescriptpoet.TypeName
import org.hamcrest.CoreMatchers.equalTo
import org.hamcrest.CoreMatchers.hasItems
import org.hamcrest.MatcherAssert.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.io.StringWriter


@DisplayName("TypeAliasSpec Tests")
class TypeAliasSpecTests {

  @Test
  @DisplayName("Generates JavaDoc at before class definition")
  fun testGenJavaDoc() {
    val testAlias = TypeAliasSpec.builder("Integer", TypeName.NUMBER)
       .addJavadoc("this is a comment\n")
       .build()

    val out = StringWriter()
    testAlias.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            /**
             * this is a comment
             */
            type Integer = number;

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates modifiers in order")
  fun testGenModifiersInOrder() {
    val testAlias = TypeAliasSpec.builder("Integer", TypeName.NUMBER)
       .addModifiers(Modifier.EXPORT)
       .build()

    val out = StringWriter()
    testAlias.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            export type Integer = number;

          """.trimIndent()
       )
    )
  }


  @Test
  @DisplayName("Generates simple alias")
  fun testSimpleAlias() {
    val testAlias = TypeAliasSpec.builder("Integer", TypeName.NUMBER)
       .build()

    val out = StringWriter()
    testAlias.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            type Integer = number;

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("Generates generic alias")
  fun testGenericAlias() {
    val typeVar = TypeName.typeVariable("A", TypeName.bound(TypeName.anyType("Test")))
    val testAlias = TypeAliasSpec.builder("StringMap", TypeName.mapType(TypeName.STRING, typeVar))
       .addTypeVariable(typeVar)
       .build()

    val out = StringWriter()
    testAlias.emit(CodeWriter(out))

    assertThat(
       out.toString(),
       equalTo(
          """
            type StringMap<A extends Test> = Map<string, A>;

          """.trimIndent()
       )
    )
  }

  @Test
  @DisplayName("toBuilder copies all fields")
  fun testToBuilder() {
    val testAliasBldr = TypeAliasSpec.builder("Test", TypeName.NUMBER)
       .addJavadoc("this is a comment\n")
       .addModifiers(Modifier.EXPORT)
       .addTypeVariable(TypeName.typeVariable("A", TypeName.bound(TypeName.anyType("Test"))))
       .build()
       .toBuilder()

    assertThat(testAliasBldr.name, equalTo("Test"))
    assertThat(testAliasBldr.type, equalTo<TypeName>(TypeName.NUMBER))
    assertThat(testAliasBldr.javaDoc.formatParts, hasItems("this is a comment\n"))
    assertThat(testAliasBldr.modifiers, hasItems(Modifier.EXPORT))
    assertThat(testAliasBldr.typeVariables.map { it.name }, hasItems("A"))
  }

}
