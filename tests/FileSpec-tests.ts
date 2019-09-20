import { FileSpec } from '@src/FileSpec';
import { FunctionSpec } from '@src/FunctionSpec';
import { StringBuffer } from '@src/StringBuffer';

describe('FileSpec', () => {
  it('generates comment at before class definition', () => {
    const spec = FileSpec.create('Test')
      .addComment('this is a comment\n')
      .addFunction(FunctionSpec.create('foo'));
    expect(emit(spec)).toMatchInlineSnapshot(`
"// this is a comment
//

function foo() {
}
"
`);
  });

  it('puts imports at the top', () => {
    const spec = FileSpec.create('Test')
      .addFunction(FunctionSpec.create('foo').returns('@rxjs/Subscriber'))
      .addFunction(FunctionSpec.create('bar').returns('@rxjs/Observable'));
    expect(emit(spec)).toMatchInlineSnapshot(`
"import { Subscriber } from 'rxjs/Subscriber';
import { Observable } from 'rxjs/Observable';


function foo(): Subscriber {
}

function bar(): Observable {
}
"
`);
  });

  it('dedups imports', () => {
    const spec = FileSpec.create('Test')
      .addFunction(FunctionSpec.create('foo').returns('@rxjs/Subscriber'))
      .addFunction(FunctionSpec.create('bar').returns('@rxjs/Subscriber'));
    expect(emit(spec)).toMatchInlineSnapshot(`
"import { Subscriber } from 'rxjs/Subscriber';


function foo(): Subscriber {
}

function bar(): Subscriber {
}
"
`);
  });

  it('does not self import', () => {
    const spec = FileSpec.create('foo').addFunction(FunctionSpec.create('foo').returns('Bar@foo'));
    expect(emit(spec)).toMatchInlineSnapshot(`
"

function foo(): Bar {
}
"
`);
  });

  it('does not self import resolved paths', () => {
    const spec = FileSpec.create('foo').addFunction(FunctionSpec.create('foo').returns('Bar@./foo'));
    expect(emit(spec)).toMatchInlineSnapshot(`
"

function foo(): Bar {
}
"
`);
  });

  it('does not self import resolved ts paths', () => {
    const spec = FileSpec.create('foo.ts').addFunction(FunctionSpec.create('foo').returns('Bar@./foo'));
    expect(emit(spec)).toMatchInlineSnapshot(`
"

function foo(): Bar {
}
"
`);
  });

  it('resolves relative paths correctly ', () => {
    // Given a file emitted to a sub directory
    let spec = FileSpec.create('sub/foo.ts');
    // And it references a relative-from-the-root path
    spec = spec.addFunction(FunctionSpec.create('foo').returns('Bar@./foo'));
    // Then it knows to resolve it
    expect(emit(spec)).toMatchInlineSnapshot(`
"import { Bar } from '../foo';


function foo(): Bar {
}
"
`);
  });

  it('resolves nested relative paths correctly ', () => {
    // Given a file emitted to a two-layer sub directory
    let spec = FileSpec.create('sub/one/foo.ts');
    // And it references a relative-from-the-root path
    spec = spec.addFunction(FunctionSpec.create('foo').returns('Bar@./sub/two'));
    // Then it knows to resolve it
    expect(emit(spec)).toMatchInlineSnapshot(`
"import { Bar } from '../../sub/two';


function foo(): Bar {
}
"
`);
  });
});

function emit(spec: FileSpec): string {
  const out = new StringBuffer();
  spec.emit(out);
  return out.toString();
}
