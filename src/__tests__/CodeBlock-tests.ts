import {CodeBlock} from "../CodeBlock";

describe("CodeBlockTest", () => {

//  1. /@Test
//  2. qf 3dw i it(" <esc> e a ",<sp> <esc> f)la => <esc> l%a ); <esc>nq
//              ____           ______            __           __
//  3. @f

  /*
  it("equalsAndHashCode", () => {
    let a = CodeBlock.builder().build();
    let b = CodeBlock.builder().build();
    expect(a.equals(b)).toBeTruthy();
    expect(a.hashCode()).toEqual(b.hashCode());
    a = CodeBlock.builder().add("$L", "taco").build();
    b = CodeBlock.builder().add("$L", "taco").build();
    expect(a.equals(b)).toBeTruthy();
    expect(a.hashCode()).toEqual(b.hashCode());
  });
  */

  it("of", () => {
    const a = CodeBlock.of("$L taco", "delicious");
    expect(a.toString()).toEqual("delicious taco");
  });

  it("isEmpty", () => {
    expect(CodeBlock.builder().isEmpty()).toBeTruthy();
    expect(CodeBlock.builder().add("").isEmpty()).toBeTruthy();
    expect(CodeBlock.builder().add(" ").isEmpty()).toBeFalsy();
  });

  it("indentCannotBeIndexed", () => {
    expect(() => {
      CodeBlock.builder().add("$1>", "taco").build();
    }).toThrow("$$, $>, $<, $[, $], $W, and $Z may not have an index");
  });

  it("deindentCannotBeIndexed", () => {
    expect(() => {
      CodeBlock.builder().add("$1<", "taco").build();
      fail();
    }).toThrow("$$, $>, $<, $[, $], $W, and $Z may not have an index");
  });

  it("dollarSignEscapeCannotBeIndexed", () => {
    expect(() => {
      CodeBlock.builder().add("$1$", "taco").build();
      fail();
    }).toThrow("$$, $>, $<, $[, $], $W, and $Z may not have an index");
  });

  it("statementBeginningCannotBeIndexed", () => {
    expect(() => {
      CodeBlock.builder().add("$1[", "taco").build();
      fail();
    }).toThrow("$$, $>, $<, $[, $], $W, and $Z may not have an index");
  });

  it("statementEndingCannotBeIndexed", () => {
    expect(() => {
      CodeBlock.builder().add("$1]", "taco").build();
      fail();
    }).toThrow("$$, $>, $<, $[, $], $W, and $Z may not have an index");
  });

  it("nameFormatCanBeIndexed", () => {
    const block = CodeBlock.builder().add("$1N", "taco").build();
    expect(block.toString()).toEqual("taco");
  });

  it("literalFormatCanBeIndexed", () => {
    const block = CodeBlock.builder().add("$1L", "taco").build();
    expect(block.toString()).toEqual("taco");
  });

  it("stringFormatCanBeIndexed", () => {
    const block = CodeBlock.builder().add("$1S", "taco").build();
    expect(block.toString()).toEqual("\"taco\"");
  });

  it("typeFormatCanBeIndexed", () => {
    const block = CodeBlock.builder().add("$1T", Map).build();
    expect(block.toString()).toEqual("Map");
  });

  it("simpleNamedArgument", () => {
    const map = { text: "taco" };
    const block = CodeBlock.builder().addNamed("$text:S", map).build();
    expect(block.toString()).toEqual("\"taco\"");
  });

  it("repeatedNamedArgument", () => {
    const map = { text: "tacos" };
    const block = CodeBlock.builder()
        .addNamed("\"I like \" + $text:S + \". Do you like \" + $text:S + \"?\"", map)
        .build();
    expect(block.toString()).toEqual(
        "\"I like \" + \"tacos\" + \". Do you like \" + \"tacos\" + \"?\"");
  });

  it("namedAndNoArgFormat", () => {
    const map = { text: "tacos" };
    const block = CodeBlock.builder()
        .addNamed("$>\n$text:L for $$3.50", map).build();
    expect(block.toString()).toEqual("\n  tacos for $3.50");
  });

  it("missingNamedArgument", () => {
    expect(() => {
      CodeBlock.builder().addNamed("$text:S", {}).build();
    }).toThrow("Missing named argument for $text");
  });

  it("lowerCaseNamed", () => {
    expect(() => {
      const map = { Text: "tacos" };
      CodeBlock.builder().addNamed("$Text:S", map).build();
    }).toThrow("argument 'Text' must start with a lowercase character");
  });

  it("multipleNamedArguments", () => {
    const map = { text: "tacos", pipe: String };
    const block = CodeBlock.builder()
        .addNamed("$pipe:T.println(\"Let's eat some $text:L\");", map)
        .build();
    expect(block.toString()).toEqual(
        "String.println(\"Let's eat some tacos\");");
  });

  it("namedNewline", () => {
    const map = { text: "tacos" };
    const block = CodeBlock.builder().addNamed("$text:S\n", map).build();
    expect(block.toString()).toEqual("tacos\n");
  });

  it("danglingNamed", () => {
    const map = { clazz: Map };
    expect(() => {
      CodeBlock.builder().addNamed("$clazz:T$", map).build();
    }).toThrow("dangling $ at end");
  });

  it("indexTooHigh", () => {
    expect(() => {
      CodeBlock.builder().add("$2T", Map).build();
    }).toThrow("index 2 for '$2T' not in range (received 1 arguments)");
  });

  it("indexIsZero", () => {
    expect(() => {
      CodeBlock.builder().add("$0T", Map).build();
    }).toThrow("index 0 for '$0T' not in range (received 1 arguments)");
  });

  it("indexIsNegative", () => {
    expect(() => {
      CodeBlock.builder().add("$-1T", Map).build();
    }).toThrow("invalid format string: '$-1T'");
  });

  it("indexWithoutFormatType", () => {
    expect(() => {
      CodeBlock.builder().add("$1", Map).build();
    }).toThrow("dangling format characters in '$1'");
  });

  it("indexWithoutFormatTypeNotAtStringEnd", () => {
    expect(() => {
      CodeBlock.builder().add("$1 taco", Map).build();
    }).toThrow("invalid format string: '$1 taco'");
  });

  it("indexButNoArguments", () => {
    expect(() => {
      CodeBlock.builder().add("$1T").build();
    }).toThrow("index 1 for '$1T' not in range (received 0 arguments)");
  });

  it("formatIndicatorAlone", () => {
    expect(() => {
      CodeBlock.builder().add("$", Map).build();
    }).toThrow("dangling format characters in '$'");
  });

  it("formatIndicatorWithoutIndexOrFormatType", () => {
    expect(() => {
      CodeBlock.builder().add("$ tacoString", Map).build();
    }).toThrow("invalid format string: '$ tacoString'");
  });

  it("sameIndexCanBeUsedWithDifferentFormats", () => {
    const block = CodeBlock.builder()
        .add("$1T.println($1S)", Map)
        .build();
    expect(block.toString()).toEqual("Map.println(\"Map\")");
  });

  it("tooManyStatementEnters", () => {
    const codeBlock = CodeBlock.builder().add("$[$[").build();
    expect(() => {
      // We can't report this error until rendering type because code blocks might be composed.
      codeBlock.toString();
    }).toThrow("statement enter $[ followed by statement enter $[");
  });

  it("statementExitWithoutStatementEnter", () => {
    const codeBlock = CodeBlock.builder().add("$]").build();
    expect(() => {
      // We can't report this error until rendering type because code blocks might be composed.
      codeBlock.toString();
    }).toThrow("statement exit $] has no matching statement enter $[");
  });

  /*
  it("join", () => {
    let codeBlocks: CodeBlock[] = [];
    codeBlocks.push(CodeBlock.of("$S", "hello"));
    codeBlocks.push(CodeBlock.of("$T", ClassName.get("world", "World")));
    codeBlocks.push(CodeBlock.of("need tacos"));

    CodeBlock joined = CodeBlock.join(codeBlocks, " || ");
    expect(joined.toString()).toEqual("\"hello\" || world.World || need tacos");
  });

  it("joining", () => {
    let codeBlocks: CodeBlock[] = [];
    codeBlocks.add(CodeBlock.of("$S", "hello"));
    codeBlocks.add(CodeBlock.of("$T", ClassName.get("world", "World")));
    codeBlocks.add(CodeBlock.of("need tacos"));

    CodeBlock joined = codeBlocks.stream().collect(CodeBlock.joining(" || "));
    expect(joined.toString()).toEqual("\"hello\" || world.World || need tacos");
  });

  it("joiningSingle", () => {
    let codeBlocks: CodeBlock[] = [];
    codeBlocks.add(CodeBlock.of("$S", "hello"));

    CodeBlock joined = codeBlocks.stream().collect(CodeBlock.joining(" || "));
    expect(joined.toString()).toEqual("\"hello\"");
  });

  it("joiningWithPrefixAndSuffix", () => {
    let codeBlocks: CodeBlock[] = [];
    codeBlocks.push(CodeBlock.of("$S", "hello"));
    codeBlocks.push(CodeBlock.of("$T", ClassName.get("world", "World")));
    codeBlocks.push(CodeBlock.of("need tacos"));

    CodeBlock joined = codeBlocks.stream().collect(CodeBlock.joining(" || ", "start {", "} end"));
    expect(joined.toString()).toEqual("start {\"hello\" || world.World || need tacos} end");
  });
  */

});

