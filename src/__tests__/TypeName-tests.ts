
import { anonymousType, anyType, BOOLEAN, DATE, Member, NUMBER, STRING } from "../TypeNames";

describe("TypeNameTests", () => {

  it("testParsingNestedImport", () => {
    const typeName = anyType("This.Is.Nested@!Api");

    expect(typeName.usage).toEqual("This.Is.Nested");
    expect(typeName.imported).toBeDefined();
    if (typeName.imported) {
      expect(typeName.imported.value).toEqual("This");
    }
  });

  it ("testAnonymousNameGen", () => {
    const typeName = anonymousType(["a", STRING], ["b", NUMBER], ["C", BOOLEAN]);
    expect(typeName.members).toEqual([
      new Member("a", STRING, false),
      new Member("b", NUMBER, false),
      new Member("C", BOOLEAN, false),
    ]);
    expect(typeName.reference()).toEqual("{ a: string, b: number, C: boolean }");

    const typeName2 = anonymousType(
       new Member("a", NUMBER, true),
       new Member("B", STRING, false),
       new Member("c", DATE, true),
    );
    expect(typeName2.members).toEqual([
      new Member("a", NUMBER, true),
      new Member("B", STRING, false),
      new Member("c", DATE, true),
    ]);
    expect(typeName2.reference()).toEqual("{ a?: number, B: string, c?: Date }");
  });

});
