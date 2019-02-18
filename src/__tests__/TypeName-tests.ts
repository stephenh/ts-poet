import { ImportsDefault, ImportsName } from "../SymbolSpecs";
import { Member, TypeNames } from '../TypeNames';

describe('TypeNameTests', () => {
  it('testParsingNestedImport', () => {
    const typeName = TypeNames.anyType('This.Is.Nested@!Api');
    expect(typeName.usage).toEqual('This.Is.Nested');
    expect(typeName.imported).toBeDefined();
    if (typeName.imported) {
      expect(typeName.imported.value).toEqual('This');
    }
    expect(typeName.toString()).toEqual('This.Is.Nested');
  });

  it('testToStringOfPrimitives', () => {
    const typeName = TypeNames.NUMBER;
    expect(typeName.toString()).toEqual('number');
  });

  it('testParsingUsage', () => {
    const typeName = TypeNames.anyType('@rxjs/Subscriber');
    expect(typeName.usage).toEqual('Subscriber');
    expect(typeName.imported).toBeDefined();
    if (typeName.imported) {
      expect(typeName.imported.value).toEqual('Subscriber');
      expect((typeName.imported as ImportsName).source).toEqual('rxjs/Subscriber');
    }
  });

  it('testParsingDefault', () => {
    const typeName = TypeNames.anyType('DataLoader=dataloader');
    expect(typeName.usage).toEqual('DataLoader');
    expect(typeName.imported).toBeDefined();
    if (typeName.imported) {
      expect(typeName.imported.value).toEqual('DataLoader');
      expect((typeName.imported as ImportsDefault).source).toEqual('dataloader');
    }
  });

  it('testAnonymousNameGen', () => {
    const typeName = TypeNames.anonymousType(
      ['a', TypeNames.STRING],
      ['b', TypeNames.NUMBER],
      ['C', TypeNames.BOOLEAN]
    );
    expect(typeName.members).toEqual([
      new Member('a', TypeNames.STRING, false),
      new Member('b', TypeNames.NUMBER, false),
      new Member('C', TypeNames.BOOLEAN, false),
    ]);
    expect(typeName.reference()).toEqual('{ a: string, b: number, C: boolean }');

    const typeName2 = TypeNames.anonymousType(
      new Member('a', TypeNames.NUMBER, true),
      new Member('B', TypeNames.STRING, false),
      new Member('c', TypeNames.DATE, true)
    );
    expect(typeName2.members).toEqual([
      new Member('a', TypeNames.NUMBER, true),
      new Member('B', TypeNames.STRING, false),
      new Member('c', TypeNames.DATE, true),
    ]);
    expect(typeName2.reference()).toEqual('{ a?: number, B: string, c?: Date }');
  });

  it('prints an array of unions', () => {
    const elementType = TypeNames.unionType(TypeNames.STRING, TypeNames.BOOLEAN);
    const typeName = TypeNames.arrayType(elementType);
    expect(typeName.toString()).toEqual('Array<string | boolean>');
  });

  it('prints an array of strings', () => {
    const typeName = TypeNames.arrayType('string');
    expect(typeName.toString()).toEqual('string[]');
  });

  it('supports type literals', () => {
    expect(TypeNames.typeLiteral('one').toString()).toEqual("'one'");
    expect(TypeNames.typeLiteral(1).toString()).toEqual('1');
    expect(TypeNames.typeLiteral(true).toString()).toEqual('true');
  });

  it('has helper methods', () => {
    expect(TypeNames.STRING.union('boolean').toString()).toEqual('string | boolean');
    expect(
      TypeNames.STRING.union('boolean')
        .union('number')
        .toString()
    ).toEqual('string | boolean | number');
    expect(TypeNames.PROMISE.param('boolean').toString()).toEqual('Promise<boolean>');
  });
});
