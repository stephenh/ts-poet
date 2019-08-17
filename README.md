
[![CircleCI](https://circleci.com/gh/stephenh/ts-poet.svg?style=svg)](https://circleci.com/gh/stephenh/ts-poet)

ts-poet
=======

ts-poet is a TypeScript code generator, inspired by Square's [JavaPoet](https://github.com/square/javapoet) code generation DSL.

(Specifically it's a port of Outfoxx's [typescriptpoet](https://github.com/outfoxx/typescriptpoet), which also generates TypeScript, but is written in Kotlin.)

The goal is to provide a middle ground in code generation that is:

a) Higher-level than templates and raw string interpolation, which often become spaghetti code to maintain, and

b) Easier-to-use than pure AST code generation (i.e. using Babel AST) where putting together simple "if" expressions is very tedious.

ts-poet achieves this by, as inspired by JavaPoet, having a DSL for building out high-level entities like types, classes, functions, and methods, but then deferring method/function implementations to a more pragmatic "combine a bunch of statements/strings" approach.

### Example Output

Here's a `HelloWorld` file:

```typescript
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/from';

class Greeter {

  private name: string;

  constructor(private name: string) {
  }

  greet(): Observable<string> {
    return Observable.from(`Hello $name`)};
  }
}
```

And this is the code to generate it with TypeScriptPoet:

```typescript
const observableTypeName = TypeNames.importedType("@rxjs/Observable")

val testClass = ClassSpec.create("Greeter")
  .addProperty("name", TypeName.STRING, false, Modifier.PRIVATE)
  .constructor(
     FunctionSpec.constructorBuilder()
       .addParameter("name", TypeName.STRING, false, Modifier.PRIVATE)
  )
  .addFunction(
     FunctionSpec.create("greet")
       .returns(TypeNames.parameterizedType(observableTypeName, TypeName.STRING))
       .addCode("return %T.%N(`Hello \$name`)", observableTypeName, SymbolSpec.from("+rxjs/add/observable/from#Observable"))
  );

FileSpec.create("Greeter").addClass(testClass).toString()
```

### Notes

* The original JavaPoet and TypeScriptPoet both heavily use the builder API; this is idiomatic in Java, but felt heavy in TypeScript, so the `FunctionSpec`, `ClassSpec`, etc., classes are themselves directly immutable and the `addProperty` methods return copies.

### TODOs

* Add LambdaSpec
* Support hashes with lamdas

