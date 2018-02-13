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

import java.util.*


/**
 * Converts a [FileSpec] to a string suitable to both human- and tsc-consumption. This honors
 * imports, indentation, and deferred variable names.
 */
internal class CodeWriter constructor(
   out: Appendable,
   private val indent: String = "  ",
   referencedSymbols: Set<SymbolSpec> = emptySet()
) : SymbolReferenceTracker {
  private val out = LineWrapper(out, indent, 100)
  private var indentLevel = 0

  private var javaDoc = false
  private var comment = false
  private var trailingNewline = false

  private var referencedSymbols = referencedSymbols.toMutableSet()

  override fun referenced(symbol: SymbolSpec) {
    referencedSymbols.add(symbol)
  }

  /**
   * When emitting a statement, this is the line of the statement currently being written. The first
   * line of a statement is indented normally and subsequent wrapped lines are double-indented. This
   * is -1 when the currently-written line isn't part of a statement.
   */
  private var statementLine = -1

  fun indent(levels: Int = 1) = apply {
    indentLevel += levels
  }

  fun unindent(levels: Int = 1) = apply {
    require(indentLevel - levels >= 0) { "cannot unindent $levels from $indentLevel" }
    indentLevel -= levels
  }

  fun emitComment(codeBlock: CodeBlock) {
    trailingNewline = true // Force the '//' prefix for the comment.
    comment = true
    try {
      emitCode(codeBlock)
      emit("\n")
    }
    finally {
      comment = false
    }
  }

  fun emitJavaDoc(javaDocCodeBlock: CodeBlock) {
    if (javaDocCodeBlock.isEmpty()) return

    emit("/**\n")
    javaDoc = true
    try {
      emitCode(javaDocCodeBlock)
    }
    finally {
      javaDoc = false
    }
    emit(" */\n")
  }

  fun emitDecorators(decorators: List<DecoratorSpec>, inline: Boolean) {
    for (decoratorSpec in decorators) {
      decoratorSpec.emit(this, inline)
      emit(if (inline) " " else "\n")
    }
  }

  /**
   * Emits `modifiers` in the standard order. Modifiers in `implicitModifiers` will not
   * be emitted.
   */
  fun emitModifiers(
     modifiers: Set<Modifier>,
     implicitModifiers: Set<Modifier> = emptySet()) {
    if (modifiers.isEmpty()) return
    for (modifier in EnumSet.copyOf(modifiers)) {
      if (implicitModifiers.contains(modifier)) continue
      emit(modifier.keyword)
      emit(" ")
    }
  }

  /**
   * Emit type variables with their bounds.
   *
   * This should only be used when declaring type variables; everywhere else bounds are omitted.
   */
  fun emitTypeVariables(typeVariables: List<TypeName.TypeVariable>) {
    if (typeVariables.isEmpty()) return

    emit("<")
    typeVariables.forEachIndexed { index, typeVariable ->
      if (index > 0) emit(", ")
      emitCode(buildString {
        append(typeVariable.name)
        if (typeVariable.bounds.isNotEmpty()) {
          val parts = mutableListOf<String>()
          parts.add(" extends")
          typeVariable.bounds.forEachIndexed { index, bound ->
            if (index > 0) parts.add(bound.combiner.symbol)
            bound.modifier?.let { parts.add(it.keyword) }
            parts.add(bound.type.reference(this@CodeWriter))
          }
          append(parts.joinToString(" "))
        }
      })
    }
    emit(">")
  }

  fun emitCode(s: String) = emitCode(CodeBlock.of(s))

  fun emitCode(format: String, vararg args: Any?) = emitCode(CodeBlock.of(format, *args))

  fun emitCode(codeBlock: CodeBlock) = apply {

    // Transfer all symbols referenced in the code block
    this@CodeWriter.referencedSymbols.addAll(codeBlock.referencedSymbols)

    var a = 0
    val partIterator = codeBlock.formatParts.listIterator()
    while (partIterator.hasNext()) {
      val part = partIterator.next()
      when (part) {
        "%L" -> emitLiteral(codeBlock.args[a++])

        "%N" -> emit(codeBlock.args[a++] as String)

        "%S" -> emitString(codeBlock.args[a++] as String?)

        "%T" -> emitTypeName(codeBlock.args[a++] as TypeName)

        "%%" -> emit("%")

        "%>" -> indent()

        "%<" -> unindent()

        "%[" -> beginStatement()

        "%]" -> endStatement()

        "%W" -> emitWrappingSpace()

        else -> {
          // Handle deferred type.
          emit(part)
        }
      }
    }
  }

  private fun beginStatement() {
    check(statementLine == -1) { "statement enter %[ followed by statement enter %[" }

    statementLine = 0
  }

  private fun endStatement() {
    check(statementLine != -1) { "statement exit %] has no matching statement enter %[" }

    if (statementLine > 0) {
      unindent(2) // End a multi-line statement. Decrease the indentation level.
    }

    statementLine = -1
  }

  private fun emitWrappingSpace() = apply {
    out.wrappingSpace(indentLevel + 2)
  }

  private fun emitTypeName(typeName: TypeName) {
    emit(typeName.reference(this))
  }

  private fun emitString(string: String?) {
    // Emit null as a literal null: no quotes.
    emit(if (string != null)
           stringLiteralWithQuotes(string)
         else
           "null")
  }

  private fun emitLiteral(o: Any?) {
    when (o) {
      is ClassSpec -> o.emit(this)
      is InterfaceSpec -> o.emit(this)
      is EnumSpec -> o.emit(this)
      is DecoratorSpec -> o.emit(this, inline = true, asParameter = true)
      is CodeBlock -> emitCode(o)
      else -> emit(o.toString())
    }
  }

  /**
   * Emits `s` with indentation as required. It's important that all code that writes to
   * [CodeWriter.out] does it through here, since we emit indentation lazily in order to avoid
   * unnecessary trailing whitespace.
   */
  fun emit(s: String) = apply {
    var first = true
    for (line in s.split('\n')) {
      // Emit a newline character. Make sure blank lines in KDoc & comments look good.
      if (!first) {
        if ((javaDoc || comment) && trailingNewline) {
          emitIndentation()
          out.append(if (javaDoc) " *" else "//")
        }
        out.append("\n")
        trailingNewline = true
        if (statementLine != -1) {
          if (statementLine == 0) {
            indent(2) // Begin multiple-line statement. Increase the indentation level.
          }
          statementLine++
        }
      }

      first = false
      if (line.isEmpty()) continue // Don't indent empty lines.

      // Emit indentation and comment prefix if necessary.
      if (trailingNewline) {
        emitIndentation()
        if (javaDoc) {
          out.append(" * ")
        }
        else if (comment) {
          out.append("// ")
        }
      }

      out.append(line)
      trailingNewline = false
    }
  }

  private fun emitIndentation() {
    for (j in 0 until indentLevel) {
      out.append(indent)
    }
  }

  /**
   * Returns the symbols that are required to be imported for this code. If there were any simple name
   * collisions, that symbol's first use is imported; which may cause compilation issues.
   */
  fun requiredImports(): Set<SymbolSpec.Imported> {
    return referencedSymbols.filterIsInstance<SymbolSpec.Imported>().toImmutableSet()
  }
}
