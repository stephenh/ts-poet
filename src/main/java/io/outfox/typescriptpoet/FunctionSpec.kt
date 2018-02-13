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


class FunctionSpec private constructor(builder: Builder) {
  val name = builder.name
  val javaDoc = builder.javaDoc.build()
  val decorators = builder.decorators.toImmutableList()
  val modifiers = builder.modifiers.toImmutableSet()
  val typeVariables = builder.typeVariables.toImmutableList()
  val returnType = builder.returnType
  val parameters = builder.parameters.toImmutableList()
  val restParameter = builder.restParameter
  val body = builder.body.build()

  init {
    require(body.isEmpty() || Modifier.ABSTRACT !in builder.modifiers) {
      "abstract function ${builder.name} cannot have code"
    }
  }

  fun abstract(): FunctionSpec {
    return FunctionSpec.builder(name)
       .addModifiers(Modifier.ABSTRACT)
       .addTypeVariables(typeVariables)
       .addParameters(parameters)
       .build()
  }

  internal fun parameter(name: String) = parameters.firstOrNull { it.name == name }

  internal fun emit(
     codeWriter: CodeWriter,
     enclosingName: String?,
     implicitModifiers: Set<Modifier>
  ) {
    codeWriter.emitJavaDoc(javaDoc)
    codeWriter.emitDecorators(decorators, false)
    codeWriter.emitModifiers(modifiers, implicitModifiers)

    emitSignature(codeWriter, enclosingName)

    val isEmptyConstructor = isConstructor && body.isEmpty()
    if (Modifier.ABSTRACT in modifiers || isEmptyConstructor) {
      codeWriter.emit(";\n")
      return
    }

    codeWriter.emit(" {\n")
    codeWriter.indent()
    codeWriter.emitCode(body)
    codeWriter.unindent()
    codeWriter.emit("}\n")
  }

  private fun emitSignature(
     codeWriter: CodeWriter,
     enclosingName: String?
  ) {
    when {
      isConstructor -> codeWriter.emitCode("constructor")
      isCallable -> codeWriter.emitCode("")
      isIndexable -> codeWriter.emitCode("[")
      else -> {
        if (enclosingName == null) {
          codeWriter.emit("function ")
        }
        codeWriter.emitCode("%L", name)
      }
    }

    if (typeVariables.isNotEmpty()) {
      codeWriter.emitTypeVariables(typeVariables)
    }

    parameters.emit(codeWriter, enclosed = !isIndexable, rest = restParameter) { param, isRest ->
      param.emit(codeWriter, isRest = isRest)
    }

    if (isIndexable) {
      codeWriter.emitCode("]")
    }

    if (returnType != null && returnType != TypeName.VOID) {
      codeWriter.emitCode(": %T", returnType)
    }

  }

  val isConstructor get() = name.isConstructor
  val isAccessor get() = modifiers.contains(Modifier.GET) || modifiers.contains(Modifier.SET)
  val isCallable get() = name.isCallable
  val isIndexable get() = name.isIndexable

  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    if (other == null) return false
    if (javaClass != other.javaClass) return false
    return toString() == other.toString()
  }

  override fun hashCode() = toString().hashCode()

  override fun toString() = buildString {
    emit(CodeWriter(this), null, emptySet())
  }

  fun toBuilder(): Builder {
    val builder = Builder(name)
    builder.javaDoc.add(javaDoc)
    builder.decorators += decorators
    builder.modifiers += modifiers
    builder.typeVariables += typeVariables
    builder.returnType = returnType
    builder.parameters += parameters
    builder.body.add(body)
    return builder
  }

  class Builder internal constructor(internal val name: String) {
    internal val javaDoc = CodeBlock.builder()
    internal val decorators = mutableListOf<DecoratorSpec>()
    internal val modifiers = mutableSetOf<Modifier>()
    internal val typeVariables = mutableListOf<TypeName.TypeVariable>()
    internal var returnType: TypeName? = null
    internal val parameters = mutableListOf<ParameterSpec>()
    internal var restParameter: ParameterSpec? = null
    internal val body = CodeBlock.builder()

    init {
      require(name.isConstructor || name.isName) {
        "not a valid name: $name"
      }
    }

    fun addJavadoc(format: String, vararg args: Any) = apply {
      javaDoc.add(format, *args)
    }

    fun addJavadoc(block: CodeBlock) = apply {
      javaDoc.add(block)
    }

    fun addDecorators(decoratorSpecs: Iterable<DecoratorSpec>) = apply {
      this.decorators += decoratorSpecs
    }

    fun addDecorator(decoratorSpec: DecoratorSpec) = apply {
      decorators += decoratorSpec
    }

    fun addModifiers(vararg modifiers: Modifier) = apply {
      this.modifiers += modifiers
    }

    fun addModifiers(modifiers: Iterable<Modifier>) = apply {
      this.modifiers += modifiers
    }

    fun addTypeVariables(typeVariables: Iterable<TypeName.TypeVariable>) = apply {
      this.typeVariables += typeVariables
    }

    fun addTypeVariable(typeVariable: TypeName.TypeVariable) = apply {
      typeVariables += typeVariable
    }

    fun returns(returnType: TypeName) = apply {
      check(!name.isConstructor) { "$name cannot have a return type" }
      this.returnType = returnType
    }

    fun addParameters(parameterSpecs: Iterable<ParameterSpec>) = apply {
      for (parameterSpec in parameterSpecs) {
        addParameter(parameterSpec)
      }
    }

    fun addParameter(parameterSpec: ParameterSpec) = apply {
      parameters += parameterSpec
    }

    fun addParameter(name: String, type: TypeName, optional: Boolean = false, defaultValue: CodeBlock, vararg modifiers: Modifier)
       = addParameter(ParameterSpec.builder(name, type, optional, *modifiers).defaultValue(defaultValue).build())

    fun addParameter(name: String, type: TypeName, optional: Boolean = false, vararg modifiers: Modifier)
       = addParameter(ParameterSpec.builder(name, type, optional, *modifiers).build())

    fun restParameter(name: String, type: TypeName)
       = restParameter(ParameterSpec.builder(name, type).build())

    fun restParameter(parameterSpec: ParameterSpec) = apply {
      this.restParameter = parameterSpec
    }

    fun addCode(format: String, vararg args: Any) = apply {
      modifiers -= Modifier.ABSTRACT
      body.add(format, *args)
    }

    fun addNamedCode(format: String, args: Map<String, *>) = apply {
      modifiers -= Modifier.ABSTRACT
      body.addNamed(format, args)
    }

    fun addCode(codeBlock: CodeBlock) = apply {
      modifiers -= Modifier.ABSTRACT
      body.add(codeBlock)
    }

    fun addComment(format: String, vararg args: Any) = apply {
      body.add("// " + format + "\n", *args)
    }

    /**
     * @param controlFlow the control flow construct and its code, such as "if (foo == 5)".
     * * Shouldn't contain braces or newline characters.
     */
    fun beginControlFlow(controlFlow: String, vararg args: Any) = apply {
      modifiers -= Modifier.ABSTRACT
      body.beginControlFlow(controlFlow, *args)
    }

    /**
     * @param controlFlow the control flow construct and its code, such as "else if (foo == 10)".
     * *     Shouldn't contain braces or newline characters.
     */
    fun nextControlFlow(controlFlow: String, vararg args: Any) = apply {
      modifiers -= Modifier.ABSTRACT
      body.nextControlFlow(controlFlow, *args)
    }

    fun endControlFlow() = apply {
      modifiers -= Modifier.ABSTRACT
      body.endControlFlow()
    }

    fun addStatement(format: String, vararg args: Any) = apply {
      modifiers -= Modifier.ABSTRACT
      body.addStatement(format, *args)
    }

    fun build() = FunctionSpec(this)
  }

  companion object {
    private const val CONSTRUCTOR = "constructor()"
    private const val CALLABLE = "callable()"
    private const val INDEXABLE = "indexable()"

    private val String.isConstructor get() = this == CONSTRUCTOR
    private val String.isCallable get() = this == CALLABLE
    private val String.isIndexable get() = this == INDEXABLE

    @JvmStatic
    fun builder(name: String) = Builder(name)

    @JvmStatic
    fun constructorBuilder() = Builder(CONSTRUCTOR)

    @JvmStatic
    fun callableBuilder() = Builder(CALLABLE)

    @JvmStatic
    fun indexableBuilder() = Builder(INDEXABLE)
  }

}
