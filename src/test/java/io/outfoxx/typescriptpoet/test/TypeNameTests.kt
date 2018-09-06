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

import io.outfoxx.typescriptpoet.TypeName
import io.outfoxx.typescriptpoet.TypeName.Anonymous.Member
import io.outfoxx.typescriptpoet.TypeName.Companion.BOOLEAN
import io.outfoxx.typescriptpoet.TypeName.Companion.DATE
import io.outfoxx.typescriptpoet.TypeName.Companion.NUMBER
import io.outfoxx.typescriptpoet.TypeName.Companion.STRING
import org.hamcrest.CoreMatchers.*
import org.hamcrest.MatcherAssert.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

@DisplayName("TypeName Tests")
class TypeNameTests {

  @Test
  @DisplayName("Parsing nested type import only imports root symbol while referencing fully nested import")
  fun testParsingNestedImport() {

    val typeName = TypeName.anyType("This.Is.Nested@!Api")

    assertThat(typeName.usage, equalTo("This.Is.Nested"))
    assertThat(typeName.imported, notNullValue())
    assertThat(typeName.imported!!.value, equalTo("This"))
  }

  @Test
  @DisplayName("Anonymous type names produce valid syntax")
  fun testAnonymousNameGen() {

    val typeName = TypeName.anonymousType("a" to STRING, "b" to NUMBER, "C" to BOOLEAN)

    assertThat(typeName.members, hasItems(Member("a", STRING, false),
                                          Member("b", NUMBER, false),
                                          Member("C", BOOLEAN, false)))
    assertThat(typeName.reference(null), equalTo("{ a: string, b: number, C: boolean }"))

    val typeName2 = TypeName.anonymousType(arrayListOf(
       Member("a", NUMBER, true),
       Member("B", STRING, false),
       Member("c", DATE, true)
    ))

    assertThat(typeName2.members, hasItems(Member("a", NUMBER, true),
                                           Member("B", STRING, false),
                                           Member("c", DATE, true)))
    assertThat(typeName2.reference(null), equalTo("{ a?: number, B: string, c?: Date }"))
  }

}
