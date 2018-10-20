import {CodeBlock} from "../CodeBlock";
import { TypeNames } from "../TypeNames";

describe("CodeBlockTest", () => {

  it("of", () => {
    const a = CodeBlock.of("%L taco", "delicious");
    expect(a.toString()).toEqual("delicious taco");
  });

  it("isEmpty", () => {
    expect(CodeBlock.empty().isEmpty()).toBeTruthy();
    expect(CodeBlock.empty().add("").isEmpty()).toBeTruthy();
    expect(CodeBlock.empty().add(" ").isEmpty()).toBeFalsy();
  });

  it("indentCannotBeIndexed", () => {
    expect(() => {
      CodeBlock.empty().add("%1>", "taco");
    }).toThrow("%%, %>, %<, %[, %], and %W may not have an index");
  });

  it("deindentCannotBeIndexed", () => {
    expect(() => {
      CodeBlock.empty().add("%1<", "taco");
    }).toThrow("%%, %>, %<, %[, %], and %W may not have an index");
  });

  it("percentSignEscapeCannotBeIndexed", () => {
    expect(() => {
      CodeBlock.empty().add("%1%", "taco");
    }).toThrow("%%, %>, %<, %[, %], and %W may not have an index");
  });

  it("statementBeginningCannotBeIndexed", () => {
    expect(() => {
      CodeBlock.empty().add("%1[", "taco");
    }).toThrow("%%, %>, %<, %[, %], and %W may not have an index");
  });

  it("statementEndingCannotBeIndexed", () => {
    expect(() => {
      CodeBlock.empty().add("%1]", "taco");
    }).toThrow("%%, %>, %<, %[, %], and %W may not have an index");
  });

  it("nameFormatCanBeIndexed", () => {
    const block = CodeBlock.empty().add("%1N", "taco");
    expect(block.toString()).toEqual("taco");
  });

  it("literalFormatCanBeIndexed", () => {
    const block = CodeBlock.empty().add("%1L", "taco");
    expect(block.toString()).toEqual("taco");
  });

  it("stringFormatCanBeIndexed", () => {
    const block = CodeBlock.empty().add("%1S", "taco");
    expect(block.toString()).toEqual("\"taco\"");
  });

  it("typeFormatCanBeIndexed", () => {
    const block = CodeBlock.empty().add("%1T", TypeNames.MAP);
    expect(block.toString()).toEqual("Map");
  });

  it("simpleNamedArgument", () => {
    const map = { text: "taco" };
    const block = CodeBlock.empty().addNamed("%text:S", map);
    expect(block.toString()).toEqual("\"taco\"");
  });

  it("repeatedNamedArgument", () => {
    const map = { text: "tacos" };
    const block = CodeBlock.empty()
        .addNamed("\"I like \" + %text:S + \". Do you like \" + %text:S + \"?\"", map)
        ;
    expect(block.toString()).toEqual(
        "\"I like \" + \"tacos\" + \". Do you like \" + \"tacos\" + \"?\"");
  });

  it("namedAndNoArgFormat", () => {
    const map = { text: "tacos" };
    const block = CodeBlock.empty()
        .addNamed("%>\n%text:L for %%3.50", map);
    expect(block.toString()).toEqual("\n  tacos for %3.50");
  });

  it("missingNamedArgument", () => {
    expect(() => {
      CodeBlock.empty().addNamed("%text:S", {});
    }).toThrow("Missing named argument for %text");
  });

  it("lowerCaseNamed", () => {
    expect(() => {
      const map = { Text: "tacos" };
      CodeBlock.empty().addNamed("%Text:S", map);
    }).toThrow("argument 'Text' must start with a lowercase character");
  });

  it("multipleNamedArguments", () => {
    const map = { text: "tacos", pipe: "String" };
    const block = CodeBlock.empty()
        .addNamed("%pipe:L.println(\"Let's eat some %text:L\");", map)
        ;
    expect(block.toString()).toEqual(
        "String.println(\"Let's eat some tacos\");");
  });

  it("namedNewline", () => {
    const map = { text: "tacos" };
    const block = CodeBlock.empty().addNamed("%text:L\n", map);
    expect(block.toString()).toEqual("tacos\n");
  });

  it("danglingNamed", () => {
    const map = { text: "tacos" };
    expect(() => {
      CodeBlock.empty().addNamed("%text:S%", map);
    }).toThrow("dangling % at end");
  });

  it("indexTooHigh", () => {
    expect(() => {
      CodeBlock.empty().add("%2T", Map);
    }).toThrow("index 2 for '%2T' not in range (received 1 arguments)");
  });

  it("indexIsZero", () => {
    expect(() => {
      CodeBlock.empty().add("%0T", Map);
    }).toThrow("index 0 for '%0T' not in range (received 1 arguments)");
  });

  it("indexIsNegative", () => {
    expect(() => {
      CodeBlock.empty().add("%-1T", Map);
    }).toThrow("invalid format string: '%-1T'");
  });

  it("indexWithoutFormatType", () => {
    expect(() => {
      CodeBlock.empty().add("%1", Map);
    }).toThrow("dangling format characters in '%1'");
  });

  it("indexWithoutFormatTypeNotAtStringEnd", () => {
    expect(() => {
      CodeBlock.empty().add("%1 taco", Map);
    }).toThrow("invalid format string: '%1 taco'");
  });

  it("indexButNoArguments", () => {
    expect(() => {
      CodeBlock.empty().add("%1T");
    }).toThrow("index 1 for '%1T' not in range (received 0 arguments)");
  });

  it("formatIndicatorAlone", () => {
    expect(() => {
      CodeBlock.empty().add("%", Map);
    }).toThrow("dangling format characters in '%'");
  });

  it("formatIndicatorWithoutIndexOrFormatType", () => {
    expect(() => {
      CodeBlock.empty().add("% tacoString", Map);
    }).toThrow("invalid format string: '% tacoString'");
  });

  it("sameIndexCanBeUsedWithDifferentFormats", () => {
    const block = CodeBlock.empty()
        .add("%1T.println(%1S)", TypeNames.MAP);
    expect(block.toString()).toEqual("Map.println(\"[object Object]\")");
  });

  it("tooManyStatementEnters", () => {
    const codeBlock = CodeBlock.empty().add("%[%[");
    expect(() => {
      // We can't report this error until rendering type because code blocks might be composed.
      codeBlock.toString();
    }).toThrow("statement enter %[ followed by statement enter %[");
  });

  it("statementExitWithoutStatementEnter", () => {
    const codeBlock = CodeBlock.empty().add("%]");
    expect(() => {
      // We can't report this error until rendering type because code blocks might be composed.
      codeBlock.toString();
    }).toThrow("statement exit %] has no matching statement enter %[");
  });

  it("join", () => {
    const codeBlocks: CodeBlock[] = [];
    codeBlocks.push(CodeBlock.of("%S", "hello"));
    codeBlocks.push(CodeBlock.of("%T", TypeNames.ANY));
    codeBlocks.push(CodeBlock.of("need tacos"));
    const joined = CodeBlock.joinToCode(codeBlocks, " || ");
    expect(joined.toString()).toEqual("\"hello\" || any || need tacos");
  });

  it("joiningSingle", () => {
    const codeBlocks: CodeBlock[] = [];
    codeBlocks.push(CodeBlock.of("%S", "hello"));
    const joined = CodeBlock.joinToCode(codeBlocks, " || ");
    expect(joined.toString()).toEqual("\"hello\"");
  });

  it("joiningWithPrefixAndSuffix", () => {
    const codeBlocks: CodeBlock[] = [];
    codeBlocks.push(CodeBlock.of("%S", "hello"));
    codeBlocks.push(CodeBlock.of("%T", TypeNames.MAP));
    codeBlocks.push(CodeBlock.of("need tacos"));
    const joined = CodeBlock.joinToCode(codeBlocks, " || ", "start {", "} end");
    expect(joined.toString()).toEqual("start {\"hello\" || Map || need tacos} end");
  });

});

