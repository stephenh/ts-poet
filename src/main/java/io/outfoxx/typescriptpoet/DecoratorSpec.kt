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


class DecoratorSpec
internal constructor(
   builder: Builder
) {
  val name = builder.name
  val parameters = builder.parameters
  val factory = builder.factory

  internal fun emit(codeWriter: CodeWriter, inline: Boolean, asParameter: Boolean = false) {

    codeWriter.emitCode("@%N", name)

    if (parameters.isNotEmpty()) {

      codeWriter.emit("(")
      if (!inline) {
        codeWriter.indent()
        codeWriter.emit("\n")
      }

      parameters.forEachIndexed { index, (first, second) ->
        if (index > 0 && index < parameters.size) {
          codeWriter.emit(",")
          codeWriter.emit(if (inline) " " else "\n")
        }
        if (!asParameter && first != null) {
          codeWriter.emit("/* $first */ ")
        }
        codeWriter.emitCode(second)
      }

      if (!inline) {
        codeWriter.unindent()
        codeWriter.emit("\n")
      }
      codeWriter.emit(")")

    }
    else if (factory ?: parameters.isNotEmpty()) {
      codeWriter.emit("()")
    }
  }

  fun toBuilder(): Builder {
    val builder = Builder(name)
    builder.parameters += parameters
    builder.factory = factory
    return builder
  }

  class Builder
  internal constructor(
     val name: SymbolSpec
  ) {
    internal val parameters = mutableListOf<Pair<String?, CodeBlock>>()
    internal var factory: Boolean? = null

    fun asFactory() = apply {
      this.factory = true
    }

    fun addParameter(name: String? = null, format: String, vararg args: Any?) = apply {
      parameters += name to CodeBlock.of(format, args)
    }

    fun addParameter(name: String? = null, codeBlock: CodeBlock) = apply {
      parameters += name to codeBlock
    }

    fun build(): DecoratorSpec {
      return DecoratorSpec(this)
    }

  }

  companion object {

    @JvmStatic
    fun builder(name: String): Builder {
      return Builder(SymbolSpec.from(name))
    }

    @JvmStatic
    fun builder(name: SymbolSpec): Builder {
      return Builder(name)
    }

  }

}
