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


class InterfaceSpec
private constructor(
   builder: InterfaceSpec.Builder
) {

  val name = builder.name
  val javaDoc = builder.javaDoc.build()
  val modifiers = builder.modifiers.toImmutableSet()
  val typeVariables = builder.typeVariables.toImmutableList()
  val superInterfaces = builder.superInterfaces.toImmutableList()
  val propertySpecs = builder.propertySpecs.toImmutableList()
  val functionSpecs = builder.functionSpecs.toImmutableList()
  val indexableSpecs = builder.indexableSpecs.toImmutableList()
  val callable = builder.callable

  internal fun emit(codeWriter: CodeWriter) {

    codeWriter.emitJavaDoc(javaDoc)
    codeWriter.emitModifiers(modifiers, setOf())
    codeWriter.emit("interface")
    codeWriter.emitCode(" %L", name)
    codeWriter.emitTypeVariables(typeVariables)

    val superClasses = superInterfaces.map { CodeBlock.of("%T", it) }.let {
      if (it.isNotEmpty()) it.joinToCode(prefix = " extends ") else CodeBlock.empty()
    }
    if (superClasses.isNotEmpty()) {
      codeWriter.emitCode("%L", superClasses)
    }

    codeWriter.emit(" {\n")
    codeWriter.indent()

    // Callable
    callable?.let {
      codeWriter.emitCode("\n")
      it.emit(codeWriter, null, setOf(Modifier.ABSTRACT))
    }

    // Properties.
    for (propertySpec in propertySpecs) {
      codeWriter.emit("\n")
      propertySpec.emit(codeWriter, setOf(Modifier.PUBLIC), asStatement = true)
    }

    // Indexables
    for (funSpec in indexableSpecs) {
      codeWriter.emit("\n")
      funSpec.emit(codeWriter, null, setOf(Modifier.PUBLIC, Modifier.ABSTRACT))
    }

    // Functions.
    for (funSpec in functionSpecs) {
      if (funSpec.isConstructor) continue
      codeWriter.emit("\n")
      funSpec.emit(codeWriter, name, setOf(Modifier.PUBLIC, Modifier.ABSTRACT))
    }

    codeWriter.unindent()

    if (!hasNoBody) {
      codeWriter.emit("\n")
    }
    codeWriter.emit("}\n")
  }

  private val hasNoBody: Boolean
    get() {
      return propertySpecs.isEmpty() && functionSpecs.isEmpty() && indexableSpecs.isEmpty() && callable == null
    }

  fun toBuilder(): Builder {
    val builder = Builder(name)
    builder.javaDoc.add(javaDoc)
    builder.modifiers += modifiers
    builder.typeVariables += typeVariables
    builder.superInterfaces += superInterfaces
    builder.propertySpecs += propertySpecs
    builder.functionSpecs += functionSpecs
    builder.indexableSpecs += indexableSpecs
    builder.callable = callable
    return builder
  }

  class Builder(
     internal val name: String
  ) {

    internal val javaDoc = CodeBlock.builder()
    internal val modifiers = mutableListOf<Modifier>()
    internal val typeVariables = mutableListOf<TypeName.TypeVariable>()
    internal val superInterfaces = mutableListOf<TypeName>()
    internal val propertySpecs = mutableListOf<PropertySpec>()
    internal val functionSpecs = mutableListOf<FunctionSpec>()
    internal val indexableSpecs = mutableListOf<FunctionSpec>()
    internal var callable: FunctionSpec? = null

    fun addJavadoc(format: String, vararg args: Any) = apply {
      javaDoc.add(format, *args)
    }

    fun addJavadoc(block: CodeBlock) = apply {
      javaDoc.add(block)
    }

    fun addModifiers(vararg modifiers: Modifier) = apply {
      this.modifiers += modifiers
    }

    fun addTypeVariables(typeVariables: Iterable<TypeName.TypeVariable>) = apply {
      this.typeVariables += typeVariables
    }

    fun addTypeVariable(typeVariable: TypeName.TypeVariable) = apply {
      typeVariables += typeVariable
    }

    fun addSuperInterface(superClass: TypeName) = apply {
      this.superInterfaces.add(superClass)
    }

    fun addProperties(propertySpecs: Iterable<PropertySpec>) = apply {
      propertySpecs.forEach { addProperty(it) }
    }

    fun addProperty(propertySpec: PropertySpec) = apply {
      require(propertySpec.decorators.isEmpty()) { "Interface properties cannot have decorators" }
      require(propertySpec.initializer == null) { "Interface properties cannot have initializers" }
      propertySpecs += propertySpec
    }

    fun addProperty(name: String, type: TypeName, optional: Boolean = false, vararg modifiers: Modifier)
       = addProperty(PropertySpec.builder(name, type, optional, *modifiers).build())

    fun addFunctions(functionSpecs: Iterable<FunctionSpec>) = apply {
      functionSpecs.forEach { addFunction(it) }
    }

    fun addFunction(functionSpec: FunctionSpec) = apply {
      require(functionSpec.modifiers.contains(Modifier.ABSTRACT)) { "Interface methods must be abstract" }
      require(functionSpec.body.isEmpty()) { "Interface methods cannot have code" }
      require(!functionSpec.isConstructor) { "Interfaces cannot have a constructor" }
      require(functionSpec.decorators.isEmpty()) { "Interface functions cannot have decorators" }
      this.functionSpecs += functionSpec
    }

    fun addIndexables(indexableSpecs: Iterable<FunctionSpec>) = apply {
      indexableSpecs.forEach { addIndexable(it) }
    }

    fun addIndexable(functionSpec: FunctionSpec) = apply {
      require(functionSpec.modifiers.contains(Modifier.ABSTRACT)) { "Indexables must be ABSTRACT" }
      this.indexableSpecs += functionSpec
    }

    fun callable(callable: FunctionSpec?) = apply {
      if (callable != null) {
        require(callable.isCallable) {
          "expected a callable signature but was ${callable.name}; use FunctionSpec.callableBuilder when building"
        }
        require(callable.modifiers == setOf(Modifier.ABSTRACT)) { "Callable must be ABSTRACT and nothing else" }
      }
      this.callable = callable
    }

    fun build(): InterfaceSpec {
      return InterfaceSpec(this)
    }
  }

  companion object {

    @JvmStatic
    fun builder(name: String) = Builder(name)

    @JvmStatic
    fun builder(classSpec: ClassSpec): Builder {
      val builder = Builder(classSpec.name)
         .addModifiers(*classSpec.modifiers.toTypedArray())
         .addProperties(classSpec.propertySpecs)
      builder.functionSpecs.forEach { builder.addFunction(it.abstract()) }
      return builder
    }

  }

}
