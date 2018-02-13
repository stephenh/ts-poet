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

import io.outfoxx.typescriptpoet.SymbolSpec
import org.hamcrest.CoreMatchers.equalTo
import org.hamcrest.CoreMatchers.instanceOf
import org.hamcrest.MatcherAssert.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test


@DisplayName("SymbolSpec Tests")
class SymbolSpecTests {

  @Test
  @DisplayName("Parsing implicitly defined (non-imported) symbols")
  fun testParsingImplicit() {

    val parsed = SymbolSpec.from("Some.Symbol.Depth")
    assertThat(parsed.value, equalTo("Some.Symbol.Depth"))
  }

  @Test
  @DisplayName("Parsing named import: exported symbol implied by module path")
  fun testParsingImplicitImportNamed() {

    val parsed = SymbolSpec.from("@rxjs/Observable")
    assertThat(parsed, instanceOf(SymbolSpec.ImportsName::class.java))

    val sym = parsed as SymbolSpec.ImportsName
    assertThat(sym.value, equalTo("Observable"))
    assertThat(sym.source, equalTo("rxjs/Observable"))
  }

  @Test
  @DisplayName("Parsing named import: exported symbol implied by generated module path")
  fun testParsingImplicitImportNamedGeneratedModule() {

    val parsed = SymbolSpec.from("@!Api")
    assertThat(parsed, instanceOf(SymbolSpec.ImportsName::class.java))

    val sym = parsed as SymbolSpec.ImportsName
    assertThat(sym.value, equalTo("Api"))
    assertThat(sym.source, equalTo("!Api"))
  }

  @Test
  @DisplayName("Parsing named import: exported symbol explicit, source relative to current dir")
  fun testParsingExplicitImportNamedSourceCurrentDirectory() {

    val parsed = SymbolSpec.from("BackendService@./some/local/source/file")
    assertThat(parsed, instanceOf(SymbolSpec.ImportsName::class.java))

    val sym = parsed as SymbolSpec.ImportsName
    assertThat(sym.value, equalTo("BackendService"))
    assertThat(sym.source, equalTo("./some/local/source/file"))
  }

  @Test
  @DisplayName("Parsing named import: exported symbol explicit, source relative to parent dir")
  fun testParsingImplicitImportNamedSourceParentDirectory() {

    val parsed = SymbolSpec.from("BackendService@../some/local/source/file")
    assertThat(parsed, instanceOf(SymbolSpec.ImportsName::class.java))

    val sym = parsed as SymbolSpec.ImportsName
    assertThat(sym.value, equalTo("BackendService"))
    assertThat(sym.source, equalTo("../some/local/source/file"))
  }

  @Test
  @DisplayName("Parsing named import: exported symbol explicit, source is implied module")
  fun testParsingExplicitImportNamed() {

    val parsed = SymbolSpec.from("SomeOtherSymbolDepth@rxjs/Observable")
    assertThat(parsed, instanceOf(SymbolSpec.ImportsName::class.java))

    val sym = parsed as SymbolSpec.ImportsName
    assertThat(sym.value, equalTo("SomeOtherSymbolDepth"))
    assertThat(sym.source, equalTo("rxjs/Observable"))
  }

  @Test
  @DisplayName("Parsing all import: exported symbol implied by module path")
  fun testParsingImplicitImportAll() {

    val parsed = SymbolSpec.from("*rxjs/Observable")
    assertThat(parsed, instanceOf(SymbolSpec.ImportsAll::class.java))

    val sym = parsed as SymbolSpec.ImportsAll
    assertThat(sym.value, equalTo("Observable"))
    assertThat(sym.source, equalTo("rxjs/Observable"))
  }

  @Test
  @DisplayName("Parsing all import: exported symbol explicit, source is implied module")
  fun testParsingExplicitImportAll() {

    val parsed = SymbolSpec.from("SomeOther*rxjs/Observable")
    assertThat(parsed, instanceOf(SymbolSpec.ImportsAll::class.java))

    val sym = parsed as SymbolSpec.ImportsAll
    assertThat(sym.value, equalTo("SomeOther"))
    assertThat(sym.source, equalTo("rxjs/Observable"))
  }

  @Test
  @DisplayName("Parsing augmentation import: exported symbol implied by module path")
  fun testParsingImplicitAugmentationWithAssociatedSymbol() {

    val parsed = SymbolSpec.from("+rxjs/add/operator/toPromise#Observable")
    assertThat(parsed, instanceOf(SymbolSpec.Augmented::class.java))

    val sym = parsed as SymbolSpec.Augmented
    assertThat(sym.value, equalTo("toPromise"))
    assertThat(sym.source, equalTo("rxjs/add/operator/toPromise"))
    assertThat(sym.augmented, equalTo("Observable"))
  }

  @Test
  @DisplayName("Parsing augmentation import: exported symbol explicit")
  fun testParsingExplicitAugmentationWithAssociatedSymbol() {

    val parsed = SymbolSpec.from("SomeSymbol+rxjs/add/operator/toPromise#Observable")
    assertThat(parsed, instanceOf(SymbolSpec.Augmented::class.java))

    val sym = parsed as SymbolSpec.Augmented
    assertThat(sym.value, equalTo("SomeSymbol"))
    assertThat(sym.source, equalTo("rxjs/add/operator/toPromise"))
    assertThat(sym.augmented, equalTo("Observable"))
  }

}
