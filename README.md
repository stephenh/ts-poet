TypeScriptPoet
==========

`TypeScriptPoet` is a Kotlin and Java API for generating `.ts` source files.

Source file generation can be useful when doing things such as annotation processing or interacting
with metadata files (e.g., database schemas, protocol formats). By generating code, you eliminate
the need to write boilerplate while also keeping a single source of truth for the metadata.

[![codebeat badge](https://codebeat.co/badges/70f7939d-185e-42d7-b7a8-ea240840a121)](https://codebeat.co/projects/github-com-outfoxx-typescriptpoet-master)


### Example

Here's a `HelloWorld` file:

```kotlin
class Greeter(val name: String) {
  fun greet() {
    println("Hello, $name")
  }
}

fun main(vararg args: String) {
  Greeter(args[0]).greet()
}
```

And this is the code to generate it with TypeScriptPoet:

```kotlin
val greeterClass = ClassName("", "Greeter")
val file = FileSpec.builder("", "HelloWorld")
    .addType(TypeSpec.classBuilder("Greeter")
        .primaryConstructor(FunSpec.constructorBuilder()
            .addParameter("name", String::class)
            .build())
        .addProperty(PropertySpec.builder("name", String::class)
            .initializer("name")
            .build())
        .addFunction(FunSpec.builder("greet")
            .addStatement("println(%S)", "Hello, \$name")
            .build())
        .build())
    .addFunction(FunSpec.builder("main")
        .addParameter("args", String::class, VARARG)
        .addStatement("%T(args[0]).greet()", greeterClass)
        .build())
    .build()

file.writeTo(System.out)
```

The [KDoc][kdoc] catalogs the complete TypeScriptPoet API, which is inspired by [JavaPoet][javapoet].


Download
--------

Download [the latest .jar][dl] or depend via Maven:

```xml
<dependency>
  <groupId>io.outfoxx</groupId>
  <artifactId>typescriptpoet</artifactId>
  <version>1.0.0</version>
</dependency>
```

or Gradle:

```groovy
compile 'io.outfoxx:typescriptpoet:1.0.0'
```

Snapshots of the development version are available in [Sonatype's `snapshots` repository][snap].


License
-------

    Copyright 2017 Outfox, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.


 [dl]: https://search.maven.org/remote_content?g=io.outfoxx&a=typescriptpoet&v=LATEST
 [snap]: https://oss.sonatype.org/content/repositories/snapshots/io/outfoxx/typescriptpoet/
 [kdoc]: https://outfoxx.github.io/typescriptpoet/0.x/typescriptpoet/io.outfoxx.typescriptpoet/
 [javapoet]: https://github.com/square/javapoet/
