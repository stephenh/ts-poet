package io.outfox.typescriptpoet.test

import io.outfox.typescriptpoet.TypeName
import org.hamcrest.CoreMatchers.equalTo
import org.hamcrest.CoreMatchers.notNullValue
import org.hamcrest.MatcherAssert.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

@DisplayName("TypeName Tests")
class TypeNameTests {

  @Test
  @DisplayName("Parsing nested type import only imports root symbol while referencing fully nested import")
  fun testParsingNestedImport() {

    val typeName = TypeName.Companion.anyType("This.Is.Nested@!Api")

    assertThat(typeName.usage, equalTo("This.Is.Nested"))
    assertThat(typeName.imported, notNullValue())
    assertThat(typeName.imported!!.value, equalTo("This"))
  }

}
