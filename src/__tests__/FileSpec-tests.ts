import { FileSpec } from '../FileSpec';
import { FunctionSpec } from '../FunctionSpec';
import { StringBuffer } from '../StringBuffer';

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
});

function emit(spec: FileSpec): string {
  const out = new StringBuffer();
  spec.emit(out);
  return out.toString();
}
