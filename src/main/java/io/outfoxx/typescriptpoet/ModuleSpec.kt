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


/** A generated `module` declaration. */
class ModuleSpec
private constructor(
   builder: Builder
) {
  val name = builder.name
  val javaDoc = builder.javaDoc.build()
  val modifiers = builder.modifiers.toImmutableList()
  val members = builder.members.toImmutableList()

  internal fun emit(codeWriter: CodeWriter) {
    if (javaDoc.isNotEmpty()) {
      codeWriter.emitComment(javaDoc)
    }

    if (modifiers.isNotEmpty()) {
      codeWriter.emitCode("%L ", modifiers.joinToString(" ") { it.keyword })
    }
    codeWriter.emitCode("module %L {\n", name)
    codeWriter.indent()

    if (members.isNotEmpty()) {
      codeWriter.emitCode("\n")
    }

    members.forEachIndexed { index, member ->
      if (index > 0) codeWriter.emit("\n")
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

    if (members.isNotEmpty()) {
      codeWriter.emitCode("\n")
    }

    codeWriter.unindent()
    codeWriter.emitCode("}\n")
  }

  fun isEmpty(): Boolean {
    return members.isEmpty()
  }

  fun isNotEmpty(): Boolean {
    return !isEmpty()
  }

  fun toBuilder(): Builder {
    val builder = Builder(name)
    builder.javaDoc.add(javaDoc)
    builder.modifiers += modifiers
    builder.members.addAll(this.members)
    return builder
  }

  open class Builder
  internal constructor(
     internal val name: String
  ) {
    internal val javaDoc = CodeBlock.builder()
    internal val modifiers = mutableSetOf<Modifier>()
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

    fun addJavadoc(format: String, vararg args: Any) = apply {
      javaDoc.add(format, *args)
    }

    fun addJavadoc(block: CodeBlock) = apply {
      javaDoc.add(block)
    }

    fun addModifier(modifier: Modifier) = apply {
      requireNoneOrOneOf(modifiers + modifier, Modifier.EXPORT,
                                                   Modifier.DECLARE)
      modifiers += modifier
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
      require(!functionSpec.isConstructor) { "cannot add ${functionSpec.name} to module $name" }
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

    fun isEmpty(): Boolean {
      return members.isEmpty()
    }

    fun isNotEmpty(): Boolean {
      return !isEmpty()
    }

    fun build() = ModuleSpec(this)
  }

  companion object {

    @JvmStatic
    fun builder(name: String) = Builder(name)

  }

}
