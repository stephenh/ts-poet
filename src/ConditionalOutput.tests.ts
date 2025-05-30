import { conditionalOutput, code, generateConditionalsUtils } from "../src";

describe("conditional outputs in the utilities file", () => {
  it("basic usage", () => {
    const util = conditionalOutput("add", code`const add(a: number, b: number) => a + b`);

    const codeChunk = code`const result = ${util}(1, 2)`;

    expect(codeChunk.toString({ conditionalUtils: "./utils.ts" })).toBe(
      'import { add } from "./utils.ts";\n\nconst result = add(1, 2);\n',
    );
  });

  it("import type", () => {
    const util = conditionalOutput("SomeId", code`type SomeId = string | number`, true);

    const codeChunk = code`declare const id: ${util}`;

    expect(codeChunk.toString({ conditionalUtils: "./utils.ts" })).toBe(
      'import type { SomeId } from "./utils.ts";\n\ndeclare const id: SomeId;\n',
    );
  });

  it("nested code generation", () => {
    const someId = conditionalOutput("SomeId", code`type SomeId = string | number`, true);
    const add = conditionalOutput("add", code`const add(a: number, b: number) => a + b`);

    const childCode = code`declare const id: ${someId}`;
    const codeChunk = code`
            ${childCode}
            const result = ${add}(1, 2)
        `;

    expect(codeChunk.toString({ conditionalUtils: "./utils.ts" })).toBe(
      'import { add, type SomeId } from "./utils.ts";\n\ndeclare const id: SomeId;\nconst result = add(1, 2);\n',
    );
  });

  it("generate utils code", () => {
    const someType = conditionalOutput("SomeType", code`type SomeType = number`);
    const someId = conditionalOutput("SomeId", code`type SomeId = string | ${someType}`);

    const codeChunk = code`declare const id: ${someId}`;
    const utils = codeChunk.collectConditionalOutputs();
    const utilsCode = generateConditionalsUtils(utils);

    expect(utilsCode.toString()).toBe("type SomeType = number;\ntype SomeId = string | SomeType;\n");
  });
});
