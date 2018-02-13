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
