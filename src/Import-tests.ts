import { emitImports, ImportsAll, ImportsDefault, ImportsName, maybeRelativePath, SideEffect, Import } from "./Import";

describe("Import", () => {
  it("parsing implicitly defined (non-imported) symbols", () => {
    const parsed = Import.from("Some.Symbol.Depth");
    expect(parsed.symbol).toEqual("Some.Symbol.Depth");
  });

  it("parsing named import: exported symbol explicit, source relative to current dir", () => {
    const parsed = Import.from("BackendService@./some/local/source/file");
    expect(parsed).toBeInstanceOf(ImportsName);

    const sym = parsed as ImportsName;
    expect(sym.symbol).toEqual("BackendService");
    expect(sym.source).toEqual("./some/local/source/file");
    expect(emit(sym)).toMatchInlineSnapshot(`"import { BackendService } from './some/local/source/file';"`);
  });

  it("parsing named import: exported symbol explicit, source relative to parent dir", () => {
    const parsed = Import.from("BackendService@../some/local/source/file");
    expect(parsed).toBeInstanceOf(ImportsName);

    const sym = parsed as ImportsName;
    expect(sym.symbol).toEqual("BackendService");
    expect(sym.source).toEqual("../some/local/source/file");
    expect(emit(sym)).toMatchInlineSnapshot(`"import { BackendService } from '../some/local/source/file';"`);
  });

  it("parsing named import: exported symbol explicit, source is implied module", () => {
    const parsed = Import.from("SomeOtherSymbolDepth@rxjs/Observable");
    expect(parsed).toBeInstanceOf(ImportsName);

    const sym = parsed as ImportsName;
    expect(sym.symbol).toEqual("SomeOtherSymbolDepth");
    expect(sym.source).toEqual("rxjs/Observable");
    expect(emit(sym)).toMatchInlineSnapshot(`"import { SomeOtherSymbolDepth } from 'rxjs/Observable';"`);
  });

  it("parsing named import: exported symbol explicit, source is implied namespaced module", () => {
    const parsed = Import.from("SomeOtherSymbolDepth@@lexical/react");
    expect(parsed).toBeInstanceOf(ImportsName);

    const sym = parsed as ImportsName;
    expect(sym.symbol).toEqual("SomeOtherSymbolDepth");
    expect(sym.source).toEqual("@lexical/react");
    expect(emit(sym)).toMatchInlineSnapshot(`"import { SomeOtherSymbolDepth } from '@lexical/react';"`);
  });

  it("parsing named import: type import", () => {
    const parsed = Import.from("t:Observable@rxjs/Observable");
    expect(parsed).toBeInstanceOf(ImportsName);

    const sym = parsed as ImportsName;
    expect(sym.symbol).toEqual("Observable");
    expect(sym.source).toEqual("rxjs/Observable");
    expect(sym.typeImport).toEqual(true);

    expect(emit(sym)).toMatchInlineSnapshot(`"import type { Observable } from 'rxjs/Observable';"`);
  });

  it("parsing all import: exported symbol explicit, source is implied module", () => {
    const parsed = Import.from("SomeOther*rxjs/Observable");
    expect(parsed).toBeInstanceOf(ImportsAll);

    const sym = parsed as ImportsAll;
    expect(sym.symbol).toEqual("SomeOther");
    expect(sym.source).toEqual("rxjs/Observable");
    expect(emit(sym)).toMatchInlineSnapshot(`"import * as SomeOther from 'rxjs/Observable';"`);
  });

  it("parsing default import", () => {
    const parsed = Import.from("DataLoader=dataloader");
    expect(parsed).toBeInstanceOf(ImportsDefault);

    const sym = parsed as ImportsDefault;
    expect(sym.symbol).toEqual("DataLoader");
    expect(sym.source).toEqual("dataloader");
    expect(emit(sym)).toMatchInlineSnapshot(`"import DataLoader from 'dataloader';"`);
  });

  it("parsing side effect import: exported symbol made available as side effect of import", () => {
    const parsed = Import.from("describe+mocha");
    expect(parsed).toBeInstanceOf(SideEffect);

    const sym = parsed as SideEffect;
    expect(sym.symbol).toEqual("describe");
    expect(sym.source).toEqual("mocha");
    expect(emit(sym)).toMatchInlineSnapshot(`"import 'mocha';"`);
  });

  it("can handle relative imports", () => {
    expect(maybeRelativePath("zaz/Zaz", "./foo/Foo")).toEqual("../foo/Foo");
  });

  it("can interpret importMappings", () => {
    const parsed = Import.from("Empty@./google/protobuf/empty");
    expect(parsed).toBeInstanceOf(ImportsName);

    const sym = parsed as ImportsName;
    expect(sym.symbol).toEqual("Empty");
    expect(sym.source).toEqual("./google/protobuf/empty");

    const importMappings = { "./google/protobuf/empty": "./external/protoapis/google/protobuf/empty" };
    expect(emit(sym, importMappings)).toMatchInlineSnapshot(
      `"import { Empty } from './external/protoapis/google/protobuf/empty';"`,
    );
  });

  it("can handle relative imports with a current directory", () => {
    expect(maybeRelativePath("./zaz/Zaz", "./foo/Foo")).toEqual("../foo/Foo");
  });

  it("can handle relative imports where importing file is in a folder with the same name as file it is importing in a folder above it", () => {
    expect(maybeRelativePath("./foo/bar", "./foo")).toEqual("../foo");
  });

  it("import an export with a more convenient alias", () => {
    const parsed = Import.from("Observable:CustomizedObservable@packages/override-properties/Observable");
    expect(parsed).toBeInstanceOf(ImportsName);

    const sym = parsed as ImportsName;
    expect(sym.symbol).toEqual("CustomizedObservable");
    expect(sym.source).toEqual("packages/override-properties/Observable");

    expect(emit(sym)).toMatchInlineSnapshot(
      `"import { Observable as CustomizedObservable } from 'packages/override-properties/Observable';"`,
    );

    // type import
    const typeImportParsed = Import.from("t:Observable:CustomizedObservable@packages/override-properties/Observable");
    expect(typeImportParsed).toBeInstanceOf(ImportsName);

    const typeSym = typeImportParsed as ImportsName;
    expect(typeSym.symbol).toEqual("CustomizedObservable");
    expect(typeSym.source).toEqual("packages/override-properties/Observable");

    expect(emit(typeSym)).toMatchInlineSnapshot(
      `"import type { Observable as CustomizedObservable } from 'packages/override-properties/Observable';"`,
    );
  });

  function emit(
    spec: Import,
    importMappings = {},
    forceRequireImports = [],
    importExtensions: boolean | "js" | "ts" = true,
  ): string {
    return emitImports([spec], "", importMappings, forceRequireImports, importExtensions).trim();
  }
});
