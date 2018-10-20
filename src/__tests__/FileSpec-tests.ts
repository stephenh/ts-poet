import { FileSpec } from "../FileSpec";
import { FunctionSpec } from "../FunctionSpec";
import { StringBuffer } from "../StringBuffer";

describe("FileSpec", () => {
  it("generates comment at before class definition", () => {
    const spec = FileSpec.create("Test")
      .addComment("this is a comment\n")
      .addFunction(FunctionSpec.create("foo"));
    expect(emit(spec)).toMatchInlineSnapshot(`
"// this is a comment
//

function foo() {
}
"
`);
  });

  it("puts imports at the top", () => {
    const spec = FileSpec.create("Test")
      .addFunction(FunctionSpec.create("foo").returns("@rxjs/Subscriber"))
      .addFunction(FunctionSpec.create("bar").returns("@rxjs/Observable"));
    expect(emit(spec)).toMatchInlineSnapshot(`
"import {Subscriber} from 'rxjs/Subscriber';
import {Observable} from 'rxjs/Observable';


function foo(): Subscriber {
}

function bar(): Observable {
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
