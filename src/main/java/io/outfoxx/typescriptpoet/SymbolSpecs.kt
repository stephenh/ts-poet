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


/**
 * Specifies a symbol and its related origin, either via import or implicit/local declaration
 *
 * @param value Value of the symbol
 */
sealed class SymbolSpec(
   open val value: String
) {

  companion object {

    private val fileNamePattern = """(?:[a-zA-Z0-9._\-]+)""".toRegex()
    private val modulePattern = """@?(?:(?:!$fileNamePattern)|(?:$fileNamePattern(?:/$fileNamePattern)*))""".toRegex()
    private val identPattern = """(?:(?:[a-zA-Z][_a-zA-Z0-9]*)|(?:[_a-zA-Z][_a-zA-Z0-9]+))""".toRegex()
    private val importPattern = """($identPattern)?([*@+])($modulePattern)(?:#($identPattern))?""".toRegex()

    /**
     * Parses a symbol reference pattern to create a symbol. The pattern
     * allows the simple definition of all symbol types including any possible
     * import variation. If the spec to parse does not follow the proper format
     * an implicit symbol is created from the unparsed spec.
     *
     * Pattern: `<symbol_name>? <import_type> <module_path> (#<augmented_symbol_name>)?`
     *
     * * symbol_name = `[a-zA-Z0-9._]+`
     *
     *        Any legal compound JS/TS symbol (e.g. symbol._member.member). If no symbol name is
     *        specified then the last component of the module path is used as the symbol name;
     *        allows easy use with libraries that follow normal conventions.
     *
     * * import_type = `@ | * | +`
     *
     *        `@` = Import named symbol from module (e.g. `import { <symbol_name> } from '<module_name>'`)
     *
     *        `*` = Import all symbols from module (e.g. `import * from '<module_name>'`)
     *
     *        `+` = Symbol is declared implicitly via import of the module (e.g. `import '<module_name>'`)
     *
     * * module_path = `!<filename> | <filename>(/<filename)*`
     *
     *        Path name specifying the module. If the module path begins with a `!` then it is considered
     *        to be a file being generated. This ensures the paths are output as relative imports.
     *
     * * augmented_symbol_name = `[a-zA-Z0-9_]+`
     *
     *        Any valid symbol name that represents the symbol that is being augmented. For example,
     *        the import `rxjs/add/observable/from` attaches the `from` method to the `Observable` class.
     *        To import it correctly the spec should be `+rxjs/add/observable/from#Observable`. Adding this
     *        parameter to augmented imports ensures they are output only when the symbol being augmented
     *        is actually used.
     *
     *
     * @param spec Symbol spec to parse.
     * @return Parsed symbol specification
     */
    @JvmStatic
    fun from(spec: String): SymbolSpec {
      val matched = importPattern.matchEntire(spec)
      if (matched != null) {
        val modulePath = matched.groups[3]!!.value
        val type = if (matched.groups[2] != null) {
          matched.groups[2]?.value!!
        }
        else {
          "@"
        }
        val symbolName = matched.groups[1]?.value ?: modulePath.split('/').last().dropWhile { it == '!' }
        val targetName = matched.groups[4]?.value
        return when (type) {
          "*" -> importsAll(symbolName, modulePath)
          "@" -> importsName(symbolName, modulePath)
          "+" -> {
            require(targetName != null) { "Augmenting imports require the name of the augmented symbol" }
            augmented(symbolName, modulePath, targetName!!)
          }
          else -> throw IllegalArgumentException("Invalid type character")
        }
      }

      return implicit(spec)
    }

    /**
     * Creates an import of all the modules exported symbols as a single
     * local named symbol
     *
     * e.g. `import * as Engine from 'templates';`
     *
     * @param localName The local name of the imported symbols
     * @param from The module to import the symbols from
     */
    @JvmStatic
    fun importsAll(localName: String, from: String): SymbolSpec {
      return ImportsAll(localName, from)
    }

    /**
     * Creates an import of a single named symbol from the module's exported
     * symbols.
     *
     * e.g. `import { Engine } from 'templates';`
     *
     * @param exportedName The symbol that is both exported and imported
     * @param from The module the symbol is exported from
     */
    @JvmStatic
    fun importsName(exportedName: String, from: String): SymbolSpec {
      return ImportsName(exportedName, from)
    }

    /**
     * Creates a symbol that is brought in by a whole module import
     * that "augments" an existing symbol.
     *
     * e.g. `import 'rxjs/add/operator/flatMap'`
     *
     * @param symbolName The augmented symbol to be imported
     * @param from The entire import that does the augmentation
     * @param target The symbol that is augmented
     */
    @JvmStatic
    fun augmented(symbolName: String, from: String, target: String): SymbolSpec {
      return Augmented(symbolName, from, target)
    }

    /**
     * An implied symbol that does no tracking of imports
     *
     * @param name The implicit symbol name
     */
    @JvmStatic
    fun implicit(name: String): SymbolSpec {
      return Implicit(name)
    }

  }

  open fun reference(trackedBy: SymbolReferenceTracker?): String {
    trackedBy?.apply { referenced(this@SymbolSpec) }
    return value
  }

  /**
   * Non-imported symbol
   */
  data class Implicit
  internal constructor(
     override val value: String
  ) : SymbolSpec(value) {

    override fun reference(trackedBy: SymbolReferenceTracker?): String {
      return value
    }

  }


  /**
   * Common base class for imported symbols
   */
  abstract class Imported(
     override val value: String,
     open val source: String
  ) : SymbolSpec(value)


  /**
   * Imports a single named symbol from the module's exported
   * symbols.
   *
   * e.g. `import { Engine } from 'templates';`
   */
  data class ImportsName
  internal constructor(
     override val value: String,
     override val source: String
  ) : Imported(value, source)


  /**
   * Imports all of the modules exported symbols as a single
   * named symbol
   *
   * e.g. `import * as Engine from 'templates';`
   */
  data class ImportsAll
  internal constructor(
     override val value: String,
     override val source: String
  ) : Imported(value, source)

  /**
   * A symbol that is brought in by a whole module import
   * that "augments" an existing symbol.
   *
   * e.g. `import 'rxjs/add/operator/flatMap'`
   */
  data class Augmented
  internal constructor(
     override val value: String,
     override val source: String,
     val augmented: String
  ) : Imported(value, source)

}
