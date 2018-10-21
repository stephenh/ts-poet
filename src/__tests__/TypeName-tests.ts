import { ImportsName } from "../SymbolSpecs";
import { Member, TypeNames } from "../TypeNames";

describe("TypeNameTests", () => {

  it("testParsingNestedImport", () => {
    const typeName = TypeNames.anyType("This.Is.Nested@!Api");
    expect(typeName.usage).toEqual("This.Is.Nested");
    expect(typeName.imported).toBeDefined();
    if (typeName.imported) {
      expect(typeName.imported.value).toEqual("This");
    }
  });

  it("testParsingUsage", () => {
    const typeName = TypeNames.anyType("@rxjs/Subscriber");
    expect(typeName.usage).toEqual("Subscriber");
    expect(typeName.imported).toBeDefined();
    if (typeName.imported) {
      expect(typeName.imported.value).toEqual("Subscriber");
      expect((typeName.imported as ImportsName).source).toEqual("rxjs/Subscriber");
    }
  });

  it ("testAnonymousNameGen", () => {
    const typeName = TypeNames.anonymousType(
      ["a", TypeNames.STRING],
      ["b", TypeNames.NUMBER],
      ["C", TypeNames.BOOLEAN]);
    expect(typeName.members).toEqual([
      new Member("a", TypeNames.STRING, false),
      new Member("b", TypeNames.NUMBER, false),
      new Member("C", TypeNames.BOOLEAN, false),
    ]);
    expect(typeName.reference()).toEqual("{ a: string, b: number, C: boolean }");

    const typeName2 = TypeNames.anonymousType(
       new Member("a", TypeNames.NUMBER, true),
       new Member("B", TypeNames.STRING, false),
       new Member("c", TypeNames.DATE, true),
    );
    expect(typeName2.members).toEqual([
      new Member("a", TypeNames.NUMBER, true),
      new Member("B", TypeNames.STRING, false),
      new Member("c", TypeNames.DATE, true),
    ]);
    expect(typeName2.reference()).toEqual("{ a?: number, B: string, c?: Date }");
  });

});
