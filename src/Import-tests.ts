import {
  Augmented,
  emitImports,
  ImportsAll,
  ImportsDefault,
  ImportsName,
  maybeRelativePath,
  SideEffect,
  Import,
} from './Import';

describe('Import', () => {
  it('parsing implicitly defined (non-imported) symbols', () => {
    const parsed = Import.from('Some.Symbol.Depth');
    expect(parsed.value).toEqual('Some.Symbol.Depth');
  });

  it('parsing named import: exported symbol implied by module path', () => {
    const parsed = Import.from('@rxjs/Observable');
    expect(parsed).toBeInstanceOf(ImportsName);

    const sym = parsed as ImportsName;
    expect(sym.value).toEqual('Observable');
    expect(sym.source).toEqual('rxjs/Observable');

    expect(emit(sym)).toMatchInlineSnapshot(`"import { Observable } from 'rxjs/Observable';"`);
  });

  it('parsing named import: exported symbol implied by generated module path', () => {
    const parsed = Import.from('@Api');
    expect(parsed).toBeInstanceOf(ImportsName);

    const sym = parsed as ImportsName;
    expect(sym.value).toEqual('Api');
    expect(sym.source).toEqual('Api');

    expect(emit(sym)).toMatchInlineSnapshot(`"import { Api } from 'Api';"`);
  });

  it('parsing named import: exported symbol explicit, source relative to current dir', () => {
    const parsed = Import.from('BackendService@./some/local/source/file');
    expect(parsed).toBeInstanceOf(ImportsName);

    const sym = parsed as ImportsName;
    expect(sym.value).toEqual('BackendService');
    expect(sym.source).toEqual('./some/local/source/file');
    expect(emit(sym)).toMatchInlineSnapshot(`"import { BackendService } from './some/local/source/file';"`);
  });

  it('parsing named import: exported symbol explicit, source relative to parent dir', () => {
    const parsed = Import.from('BackendService@../some/local/source/file');
    expect(parsed).toBeInstanceOf(ImportsName);

    const sym = parsed as ImportsName;
    expect(sym.value).toEqual('BackendService');
    expect(sym.source).toEqual('../some/local/source/file');
    expect(emit(sym)).toMatchInlineSnapshot(`"import { BackendService } from '../some/local/source/file';"`);
  });

  it('parsing named import: exported symbol explicit, source is implied module', () => {
    const parsed = Import.from('SomeOtherSymbolDepth@rxjs/Observable');
    expect(parsed).toBeInstanceOf(ImportsName);

    const sym = parsed as ImportsName;
    expect(sym.value).toEqual('SomeOtherSymbolDepth');
    expect(sym.source).toEqual('rxjs/Observable');
    expect(emit(sym)).toMatchInlineSnapshot(`"import { SomeOtherSymbolDepth } from 'rxjs/Observable';"`);
  });

  it('parsing all import: exported symbol implied by module path', () => {
    const parsed = Import.from('*rxjs/Observable');
    expect(parsed).toBeInstanceOf(ImportsAll);

    const sym = parsed as ImportsAll;
    expect(sym.value).toEqual('Observable');
    expect(sym.source).toEqual('rxjs/Observable');
    expect(emit(sym)).toMatchInlineSnapshot(`"import * as Observable from 'rxjs/Observable';"`);
  });

  it('parsing all import: exported symbol explicit, source is implied module', () => {
    const parsed = Import.from('SomeOther*rxjs/Observable');
    expect(parsed).toBeInstanceOf(ImportsAll);

    const sym = parsed as ImportsAll;
    expect(sym.value).toEqual('SomeOther');
    expect(sym.source).toEqual('rxjs/Observable');
    expect(emit(sym)).toMatchInlineSnapshot(`"import * as SomeOther from 'rxjs/Observable';"`);
  });

  it('parsing default import', () => {
    const parsed = Import.from('DataLoader=dataloader');
    expect(parsed).toBeInstanceOf(ImportsDefault);

    const sym = parsed as ImportsDefault;
    expect(sym.value).toEqual('DataLoader');
    expect(sym.source).toEqual('dataloader');
    expect(emit(sym)).toMatchInlineSnapshot(`"import DataLoader from 'dataloader';"`);
  });

  it('parsing side effect import: exported symbol made available as side effect of import', () => {
    const parsed = Import.from('describe+mocha');
    expect(parsed).toBeInstanceOf(SideEffect);

    const sym = parsed as SideEffect;
    expect(sym.value).toEqual('describe');
    expect(sym.source).toEqual('mocha');
    expect(emit(sym)).toMatchInlineSnapshot(`"import 'mocha';"`);
  });

  it('parsing augmentation import: exported symbol implied by module path', () => {
    const parsed = Import.from('+rxjs/add/operator/toPromise#Observable');
    expect(parsed).toBeInstanceOf(Augmented);

    const sym = parsed as Augmented;
    expect(sym.value).toEqual('toPromise');
    expect(sym.source).toEqual('rxjs/add/operator/toPromise');
    expect(sym.augmented).toEqual('Observable');
    expect(emit(sym)).toMatchInlineSnapshot(`""`);
  });

  it('parsing augmentation import: exported symbol explicit', () => {
    const parsed = Import.from('SomeSymbol+rxjs/add/operator/toPromise#Observable');
    expect(parsed).toBeInstanceOf(Augmented);

    const sym = parsed as Augmented;
    expect(sym.value).toEqual('SomeSymbol');
    expect(sym.source).toEqual('rxjs/add/operator/toPromise');
    expect(sym.augmented).toEqual('Observable');
    expect(emit(sym)).toMatchInlineSnapshot(`""`);
  });

  it('can handle relative imports', () => {
    expect(maybeRelativePath('zaz/Zaz', './foo/Foo')).toEqual('../foo/Foo');
  });

  it('can handle relative imports with a current directory', () => {
    expect(maybeRelativePath('./zaz/Zaz', './foo/Foo')).toEqual('../foo/Foo');
  });

  function emit(spec: Import): string {
    return emitImports([spec], '').trim();
  }
});
