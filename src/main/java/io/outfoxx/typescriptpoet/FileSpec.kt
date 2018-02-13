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

package io.outfoxx.typescriptpoet

import java.io.File
import java.io.IOException
import java.io.OutputStreamWriter
import java.nio.charset.StandardCharsets.UTF_8
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths


/**
 * A TypeScript file containing top level objects like classes, objects, functions, properties, and type
 * aliases.
 *
 * Items are output in the following order:
 * - Comment
 * - Imports
 * - Members
 */
class FileSpec
private constructor(
   builder: Builder
) {
  val path = builder.path
  val comment = builder.comment.build()
  val members = builder.members.toList()
  val indent = builder.indent


  fun exportType(typeName: String): TypeName? {
    val typeNameParts = typeName.split('.')
    return exportNamed(typeNameParts.first())?.let {
      TypeName.anyType(typeName, it)
    }
  }

  fun exportNamed(symbolName: String): SymbolSpec? {
    return members
       .map {
         when (it) {
           is ModuleSpec -> it.name
           is ClassSpec -> it.name
           is InterfaceSpec -> it.name
           is EnumSpec -> it.name
           is FunctionSpec -> it.name
           is PropertySpec -> it.name
           is TypeAliasSpec -> it.name
           else -> throw IllegalStateException("unrecognized member type")
         }
       }
       .firstOrNull { it == symbolName }
       ?.let { SymbolSpec.importsName(symbolName, "!" + path) }
  }

  fun exportAll(localName: String): SymbolSpec {
    return SymbolSpec.importsAll(localName, "!" + path)
  }

  @Throws(IOException::class)
  fun writeTo(out: Appendable) {
    // First pass: emit the entire class, just to collect the types we'll need to import.
    val importsCollector = CodeWriter(NullAppendable, indent)
    emit(importsCollector)
    val requiredImports = importsCollector.requiredImports()

    // Second pass: write the code, taking advantage of the imports.
    val codeWriter = CodeWriter(out, indent, requiredImports)
    emit(codeWriter)
  }

  /** Writes this to `directory` as UTF-8 using the standard directory structure.  */
  @Throws(IOException::class)
  fun writeTo(directory: Path) {
    require(Files.notExists(directory) || Files.isDirectory(directory)) {
      "path $directory exists but is not a directory."
    }
    val outputPath = directory.resolve("$path.ts")
    OutputStreamWriter(Files.newOutputStream(outputPath), UTF_8).use { writer -> writeTo(writer) }
  }

  /** Writes this to `directory` as UTF-8 using the standard directory structure.  */
  @Throws(IOException::class)
  fun writeTo(directory: File) = writeTo(directory.toPath())

  private fun emit(codeWriter: CodeWriter) {
    if (comment.isNotEmpty()) {
      codeWriter.emitComment(comment)
    }

    val imports = codeWriter.requiredImports()
    val augmentImports = codeWriter.requiredImports()
       .filterIsInstance<SymbolSpec.Augmented>()
       .groupBy { it.augmented }

    if (imports.isNotEmpty()) {
      imports
         .groupBy { FileModules.importPath(path, it.source) }
         .toSortedMap()
         .forEach { (sourceImportPath, imports) ->
           if (path == sourceImportPath || Paths.get(".").resolve(path) == sourceImportPath) {
             return@forEach
           }

           imports.filterIsInstance<SymbolSpec.ImportsAll>().forEach { import ->
             // Output star imports individually
             codeWriter.emitCode("%[import * as %L from '%L';\n%]", import.value, sourceImportPath)
             // Output related augments
             augmentImports[import.value]?.forEach { augment ->
               codeWriter.emitCode("%[import '%L';\n%]", augment.source)
             }
           }

           imports.filterIsInstance<SymbolSpec.ImportsName>()
              .map { it.value }
              .toSortedSet()
              .let { names ->
                if (names.isEmpty()) return@let
                // Output named imports as a group
                codeWriter
                   .emitCode("import {")
                   .indent()
                   .emitCode(names.joinToString(", "))
                   .unindent()
                   .emitCode("} from '%L';\n", sourceImportPath)
                // Output related augments
                names.forEach { name ->
                  augmentImports[name]?.forEach { augment ->
                    codeWriter.emitCode("%[import '%L';\n%]", augment.source)
                  }
                }
              }

         }

      codeWriter.emit("\n")
    }

    members.filterNot { it is ModuleSpec }.forEach { member ->
      codeWriter.emit("\n")
      when (member) {
        is ModuleSpec -> member.emit(codeWriter)
        is InterfaceSpec -> member.emit(codeWriter)
        is ClassSpec -> member.emit(codeWriter)
        is EnumSpec -> member.emit(codeWriter)
        is FunctionSpec -> member.emit(codeWriter, null, setOf(
           Modifier.PUBLIC))
        is PropertySpec -> member.emit(codeWriter, setOf(
           Modifier.PUBLIC), asStatement = true)
        is TypeAliasSpec -> member.emit(codeWriter)
        else -> throw AssertionError()
      }
    }

    members.filterIsInstance<ModuleSpec>().forEach { member ->
      codeWriter.emit("\n")
      member.emit(codeWriter)
    }


  }

  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    if (other == null) return false
    if (javaClass != other.javaClass) return false
    return toString() == other.toString()
  }

  override fun hashCode() = toString().hashCode()

  override fun toString() = buildString { writeTo(this) }

  fun isEmpty(): Boolean {
    return members.isEmpty()
  }

  fun isNotEmpty(): Boolean {
    return !isEmpty()
  }

  fun toBuilder(): Builder {
    val builder = Builder(path)
    builder.comment.add(comment)
    builder.members.addAll(this.members)
    builder.indent = indent
    return builder
  }

  class Builder internal constructor(
     internal val path: Path
  ) {
    internal val comment = CodeBlock.builder()
    internal var indent = "  "
    internal val members = mutableListOf<Any>()

    private fun checkMemberModifiers(modifiers: Set<Modifier>) {
      requireNoneOf(
         modifiers,
         Modifier.PUBLIC,
         Modifier.PROTECTED,
         Modifier.PRIVATE,
         Modifier.READONLY,
         Modifier.GET,
         Modifier.SET,
         Modifier.STATIC,
         Modifier.CONST,
         Modifier.LET,
         Modifier.VAR
      )
    }

    fun addComment(format: String, vararg args: Any) = apply {
      comment.add(format, *args)
    }

    fun addModule(moduleSpec: ModuleSpec) = apply {
      members += moduleSpec
    }

    fun addClass(classSpec: ClassSpec) = apply {
      checkMemberModifiers(classSpec.modifiers)
      members += classSpec
    }

    fun addInterface(ifaceSpec: InterfaceSpec) = apply {
      checkMemberModifiers(ifaceSpec.modifiers)
      members += ifaceSpec
    }

    fun addEnum(enumSpec: EnumSpec) = apply {
      checkMemberModifiers(enumSpec.modifiers)
      members += enumSpec
    }

    fun addFunction(functionSpec: FunctionSpec) = apply {
      require(!functionSpec.isConstructor) { "cannot add ${functionSpec.name} to file $path" }
      require(functionSpec.decorators.isEmpty()) { "decorators on module functions are not allowed" }
      checkMemberModifiers(functionSpec.modifiers)
      members += functionSpec
    }

    fun addProperty(propertySpec: PropertySpec) = apply {
      requireExactlyOneOf(propertySpec.modifiers, Modifier.CONST,
                                                    Modifier.LET,
                                                    Modifier.VAR)
      require(propertySpec.decorators.isEmpty()) { "decorators on file properties are not allowed" }
      checkMemberModifiers(propertySpec.modifiers)
      members += propertySpec
    }

    fun addTypeAlias(typeAliasSpec: TypeAliasSpec) = apply {
      members += typeAliasSpec
    }

    fun indent(indent: String) = apply {
      this.indent = indent
    }

    fun isEmpty(): Boolean {
      return members.isEmpty()
    }

    fun isNotEmpty(): Boolean {
      return !isEmpty()
    }

    fun build() = FileSpec(this)
  }

  companion object {

    @JvmStatic
    fun builder(fileName: String, directory: Path) = Builder(
       directory.resolve(fileName))

    @JvmStatic
    fun builder(filePath: String) = Builder(Paths.get(filePath))

    @JvmStatic
    fun builder(filePath: Path) = Builder(filePath)

    @JvmStatic
    fun builder(module: ModuleSpec): Builder {
      val file = builder(module.name)
      file.members.addAll(module.members.toMutableList())
      return file
    }

  }

}
