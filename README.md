
ts-poet
=======

This is a TypeScript port of the Square JavaPoet code generation DSL.

Specifically it's a port of Outfoxx's [typescriptpoet](https://github.com/outfoxx/typescriptpoet), which is a Kotlin DSL for generating TypeScript output (e.g. in JVM-based build/codegen pipelines), to TypeScript for both the DSL-input and source-output.

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
   )

FileSpec.create("Greeter").addClass(testClass).toString()
```

### Notes

* The original JavaPoet and TypeScriptPoet both heavily use the builder API; this is idiomatic in Java, but felt heavy in TypeScript, so the `FunctionSpec`, `ClassSpec`, etc., classes are themselves directly immutable and the `addProperty` methods return copies.


