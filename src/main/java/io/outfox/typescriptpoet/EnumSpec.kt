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

package io.outfox.typescriptpoet


class EnumSpec
private constructor(
   builder: Builder
) {
  val name = builder.name
  val javaDoc = builder.javaDoc.build()
  val modifiers = builder.modifiers.toImmutableSet()
  val constants = builder.constants.toImmutableMap()

  internal fun emit(codeWriter: CodeWriter) {

    codeWriter.emitJavaDoc(javaDoc)
    codeWriter.emitModifiers(modifiers, setOf())
    codeWriter.emitCode("enum %L {\n", name)

    codeWriter.indent()
    val i = constants.entries.iterator()
    while (i.hasNext()) {
      val constant = i.next()
      codeWriter.emitCode("%L", constant.key)
      constant.value?.let {
        codeWriter.emitCode(" = ")
        codeWriter.emitCode(it)
      }
      if (i.hasNext()) {
        codeWriter.emit(",\n")
      }
      else {
        codeWriter.emit("\n")
      }
    }

    codeWriter.unindent()
    codeWriter.emit("}\n")
  }

  private val hasNoBody: Boolean
    get() = constants.isEmpty()

  fun toBuilder(): EnumSpec.Builder {
    val builder = EnumSpec.Builder(name)
    builder.javaDoc.add(javaDoc)
    builder.modifiers += modifiers
    builder.constants += constants
    return builder
  }

  class Builder
  internal constructor(
     val name: String,
     val constants: MutableMap<String, CodeBlock?> = mutableMapOf()
  ) {
    internal val javaDoc = CodeBlock.builder()
    internal val modifiers = mutableListOf<Modifier>()

    fun addJavadoc(format: String, vararg args: Any) = apply {
      javaDoc.add(format, *args)
    }

    fun addJavadoc(block: CodeBlock) = apply {
      javaDoc.add(block)
    }

    fun addModifiers(vararg modifiers: Modifier) = apply {
      modifiers.forEach { require(it == Modifier.EXPORT || it == Modifier.DECLARE) }
      this.modifiers += modifiers
    }

    fun addConstant(name: String, initializer: String? = null) =
       addConstant(name, initializer?.let { CodeBlock.of(it) })

    fun addConstant(name: String, initializer: CodeBlock?) = apply {
      require(name.isName) { "not a valid enum constant: $name" }
      constants.put(name, initializer)
    }

    fun build(): EnumSpec {
      return EnumSpec(this)
    }
  }

  companion object {

    @JvmStatic
    fun builder(name: String) = EnumSpec.Builder(name)

    @JvmStatic
    fun builder(name: TypeName) = EnumSpec.Builder(name.reference(null))

  }

}
