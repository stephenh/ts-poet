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

import io.outfoxx.typescriptpoet.TypeName.TypeVariable.Bound
import io.outfoxx.typescriptpoet.TypeName.TypeVariable.Bound.Combiner
import io.outfoxx.typescriptpoet.TypeName.TypeVariable.Bound.Combiner.UNION


/**
 * Name of any possible type that can be referenced
 *
 */
sealed class TypeName {

  /**
   * Produces a string representation of the type name
   * in TypeScript syntax.
   *
   * @param trackedBy An optional symbol tracker that is notified of each symbol used
   * @return String type representation in TypeScript syntax
   */
  abstract fun reference(trackedBy: SymbolReferenceTracker?): String



  data class Any
  internal constructor(
     val usage: String,
     val imported: SymbolSpec?
  ) : TypeName() {

    override fun reference(trackedBy: SymbolReferenceTracker?): String {
      imported?.reference(trackedBy)
      return usage
    }

  }


  data class Parameterized
  internal constructor(
     val name: TypeName,
     val typeArgs: List<TypeName>
  ) : TypeName() {

    override fun reference(trackedBy: SymbolReferenceTracker?): String {
      val name = name.reference(trackedBy)
      val typeArgs = typeArgs.map { it.reference(trackedBy) }
      return "$name<${typeArgs.joinToString(", ")}>"
    }

  }


  data class TypeVariable
  internal constructor(
     val name: String,
     val bounds: List<Bound>
  ) : TypeName() {

    data class Bound(
       val type: TypeName,
       val combiner: Combiner = UNION,
       val modifier: Bound.Modifier?
    ) {

      enum class Combiner(
         val symbol: String
      ) {
        UNION("|"),
        INTERSECT("&")
      }

      enum class Modifier(
         val keyword: String
      ) {
        KEY_OF("keyof")
      }

    }

    override fun reference(trackedBy: SymbolReferenceTracker?): String {
      return name
    }

  }


  data class Anonymous
  internal constructor(
     val members: List<Member>
  ) : TypeName() {

    data class Member(
       val name: String,
       val type: TypeName
    )

    override fun reference(trackedBy: SymbolReferenceTracker?): String {
      val typeRequirements = members.associate({ it.name to it.type.reference(trackedBy) })
      return "{ ${typeRequirements.entries.joinToString(", ") { "'${it.key}': ${it.value}" }} }"
    }

  }


  data class Tuple
  internal constructor(
     val memberTypes: List<TypeName>
  ) : TypeName() {

    override fun reference(trackedBy: SymbolReferenceTracker?): String {
      val typeRequirements = memberTypes.map { it.reference(trackedBy) }
      return "[${typeRequirements.joinToString(", ")}]"
    }

  }


  data class Intersection
  internal constructor(
     val typeRequirements: List<TypeName>
  ) : TypeName() {

    override fun reference(trackedBy: SymbolReferenceTracker?): String {
      val typeRequirements = typeRequirements.map { it.reference(trackedBy) }
      return typeRequirements.joinToString(" & ")
    }

  }


  data class Union
  internal constructor(
     val typeChoices: List<TypeName>
  ) : TypeName() {

    override fun reference(trackedBy: SymbolReferenceTracker?): String {
      val typeRequirements = typeChoices.map { it.reference(trackedBy) }
      return typeRequirements.joinToString(" | ")
    }

  }


  data class Lambda
  internal constructor(
     private val parameters: Map<String, TypeName> = emptyMap(),
     private val returnType: TypeName = VOID
  ) : TypeName() {

    override fun reference(trackedBy: SymbolReferenceTracker?): String {
      val params = parameters.map { "${it.key}: ${it.value.reference(trackedBy)}" }.joinToString(", ")
      return "($params) => ${returnType.reference(trackedBy)}"
    }

  }

  companion object {

    val NULL = anyType("null")
    val UNDEFINED = anyType("undefined")
    val NEVER = anyType("never")
    val VOID = anyType("void")
    val ANY = anyType("any")
    val BOOLEAN = anyType("boolean")
    val NUMBER = anyType("number")
    val STRING = anyType("string")
    val OBJECT = anyType("Object")
    val DATE = anyType("Date")
    val ARRAY = anyType("Array")
    val SET = anyType("Set")
    val MAP = anyType("Map")
    val BUFFER = anyType("Buffer")
    val ARRAY_BUFFER = anyType("ArrayBuffer")

    /**
     * An imported type name
     *
     * @param spec Import spec for type name
     */
    @JvmStatic
    fun importedType(spec: String): Any {
      val symbolSpec = SymbolSpec.from(spec)
      return anyType(symbolSpec.value, symbolSpec)
    }

    /**
     * Any class/enum/primitive/etc type name
     *
     * @param name Name for the type, will be symbolized
     */
    @JvmStatic
    fun anyType(name: String): Any {
      val idx = name.indexOfAny("*@+".toCharArray())
      if (idx != -1) {
        val usage = name.substring(0, idx)
        val imported = SymbolSpec.from(
           "${usage.split('.').first()}${name.substring(idx)}")
        return anyType(if (usage.isEmpty()) imported.value else usage,
                                                                    imported)
      }
      return anyType(name, null)
    }

    /**
     * Any class/enum/primitive/etc type name
     *
     * @param name Name for the type, will be symbolized
     * @param imported
     */
    @JvmStatic
    fun anyType(usage: String, imported: SymbolSpec?): Any {
      return Any(usage, imported)
    }

    /**
     * Type name for the generic Array type
     *
     * @param elementType Element type of the array
     * @return Type name of the new array type
     */
    @JvmStatic
    fun arrayType(elementType: TypeName): TypeName {
      return parameterizedType(
         ARRAY, elementType)
    }

    /**
     * Type name for the generic Set type
     *
     * @param elementType Element type of the set
     * @return Type name of the new set type
     */
    @JvmStatic
    fun setType(elementType: TypeName): TypeName {
      return parameterizedType(
         SET, elementType)
    }

    /**
     * Type name for the generic Map type
     *
     * @param elementType Element type of the map
     * @return Type name of the new map type
     */
    @JvmStatic
    fun mapType(keyType: TypeName, valueType: TypeName): TypeName {
      return parameterizedType(
         MAP, keyType, valueType)
    }

    /**
     * Parameterized type that represents a concrete
     * usage of a generic type
     *
     * @param rawType Generic type to invoke with arguments
     * @param typeArgs Names of the provided type arguments
     * @return Type name of the new parameterized type
     */
    @JvmStatic
    fun parameterizedType(rawType: TypeName, vararg typeArgs: TypeName): Parameterized {
      return Parameterized(rawType, typeArgs.toList())
    }

    /**
     * Type variable represents a single variable type in a
     * generic type or function.
     *
     * @param name The name of the variable as it will be used in the definition
     * @param bounds Bound constraints that will be required during instantiation
     * @return Type name of the new type variable
     */
    @JvmStatic
    fun typeVariable(name: String, vararg bounds: Bound): TypeVariable {
      return TypeVariable(name, bounds.toList())
    }

    /**
     * Factory for type variable bounds
     */
    @JvmStatic
    fun bound(type: TypeName, combiner: Combiner = UNION,
              modifier: Bound.Modifier? = null): Bound {
      return Bound(type, combiner, modifier)
    }

    /**
     * Factory for type variable bounds
     */
    @JvmStatic
    fun bound(type: String, combiner: Combiner = UNION, modifier: Bound.Modifier? = null): Bound {
      return Bound(anyType(type), combiner, modifier)
    }

    /**
     * Factory for type variable bounds
     */
    @JvmStatic
    fun unionBound(type: String, keyOf: Boolean = false): Bound {
      return unionBound(
         anyType(type), keyOf)
    }

    /**
     * Factory for type variable bounds
     */
    @JvmStatic
    fun unionBound(type: TypeName, keyOf: Boolean = false): Bound {
      return bound(type, Combiner.UNION,
                                                                if (keyOf) Bound.Modifier.KEY_OF else null)
    }

    /**
     * Factory for type variable bounds
     */
    @JvmStatic
    fun intersectBound(type: String, keyOf: Boolean = false): Bound {
      return intersectBound(
         anyType(type), keyOf)
    }

    /**
     * Factory for type variable bounds
     */
    @JvmStatic
    fun intersectBound(type: TypeName, keyOf: Boolean = false): Bound {
      return bound(type, Combiner.INTERSECT,
                                                                if (keyOf) Bound.Modifier.KEY_OF else null)
    }

    /**
     * Anonymous type name (e.g. `{ length: number, name: string }`)
     *
     * @param members Member pairs to define the anonymous type
     * @return Type name representing the anonymous type
     */
    @JvmStatic
    fun anonymousType(vararg members: Pair<String, TypeName>): Anonymous {
      return Anonymous(
         members.map { Anonymous.Member(it.first, it.second) })
    }

    /**
     * Tuple type name (e.g. `[number, boolean, string]`}
     *
     * @param memberTypes Each argument represents a distinct member type
     * @return Type name representing the tuple type
     */
    @JvmStatic
    fun tupleType(vararg memberTypes: TypeName): Tuple {
      return Tuple(memberTypes.toList())
    }

    /**
     * Intersection type name (e.g. `Person & Serializable & Loggable`)
     *
     * @param typeRequirments Requirements of the intersection as individual type names
     * @return Type name representing the intersection type
     */
    @JvmStatic
    fun intersectionType(vararg typeRequirements: TypeName): Intersection {
      return Intersection(typeRequirements.toList())
    }

    /**
     * Union type name (e.g. `int | number | any`)
     *
     * @param typeChoices All possible choices allowed in the union
     * @return Type name representing the union type
     */
    @JvmStatic
    fun unionType(vararg typeChoices: TypeName): Union {
      return Union(typeChoices.toList())
    }

    /** Returns a lambda type with `returnType` and parameters of listed in `parameters`. */
    @JvmStatic
    fun lambda(parameters: Map<String, TypeName> = emptyMap(), returnType: TypeName) =
       Lambda(parameters, returnType)

    /** Returns a lambda type with `returnType` and parameters of listed in `parameters`. */
    @JvmStatic
    fun lambda(vararg parameters: Pair<String, TypeName> = emptyArray(), returnType: TypeName)
       = Lambda(parameters.toMap(), returnType)

  }

}
