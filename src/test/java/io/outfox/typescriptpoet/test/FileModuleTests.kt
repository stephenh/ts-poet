package io.outfox.typescriptpoet.test

import io.outfox.typescriptpoet.FileModules.importPath
import org.hamcrest.CoreMatchers.equalTo
import org.hamcrest.MatcherAssert.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.nio.file.Paths


@DisplayName("FileModule Tests")
class FileModuleTests {

  @Test
  @DisplayName("Generates correct import path for relative paths")
  fun testRelativeImportPathGeneration() {

    val source = "!generated/src/main/api/Api"
    val importer = Paths.get("generated/src/main/impl/Impl")

    val path = importPath(importer, source)
    assertThat(path.toString(), equalTo("../api/Api"))
  }

  @Test
  @DisplayName("Generates correct import path for relative paths referencing the same dir")
  fun testRelativeImportPathGenerationSameDir() {

    val source = "!generated/src/main/api/Api"
    val importer = Paths.get("generated/src/main/api/Api2")


    val path = importPath(importer, source)
    assertThat(path.toString(), equalTo("./Api"))
  }

  @Test
  @DisplayName("Generates correct import path for sibling paths with no parent")
  fun testRelativeImportPathGenerationSiblingsNoParent() {

    val source = "!Api"
    val importer = Paths.get("Api2")


    val path = importPath(importer, source)
    assertThat(path.toString(), equalTo("./Api"))
  }

  @Test
  @DisplayName("Generates correct import path for implied modules")
  fun testImpliedImportPathGeneration() {

    val source = "rxjs/Observable"
    val importer = Paths.get("generated/src/main/impl/Impl")


    val path = importPath(importer, source)
    assertThat(path.toString(), equalTo("rxjs/Observable"))
  }

}
