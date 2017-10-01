package io.outfox.typescriptpoet

import java.nio.file.Path
import java.nio.file.Paths


object FileModules {

  private val CURRENT_DIR = Paths.get(".")

  fun importPath(importer: Path, source: String): Path {
    return if (source.startsWith("!")) {
      // Ensure two generated files use proper relative import path
      val sourceFilePath = Paths.get(source.drop(1))
      val importDirPath = importer.parentOrCurrent.relativize(sourceFilePath.parentOrCurrent).normalize()
      val importFilePath = importDirPath.resolve(sourceFilePath.fileName)

      // Ensure TS always imports the file relative to the importing file...
      if (importFilePath.startsWith("..") || importFilePath.startsWith("."))
        importFilePath
      else
        CURRENT_DIR.resolve(importFilePath)
    }
    else {
      Paths.get(source)
    }
  }

}

private val Path.parentOrCurrent: Path
   get() = if (this.parent != null) this.parent else Paths.get(".")
