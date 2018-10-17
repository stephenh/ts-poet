import { ClassSpec } from "../ClassSpec";
import { CodeBlock } from "../CodeBlock";
import { CodeWriter } from "../CodeWriter";
import { DecoratorSpec } from "../DecoratorSpec";
import { FileSpec } from "../FileSpec";
import { FunctionSpec } from "../FunctionSpec";
import { Modifier } from "../Modifier";
import { PropertySpec } from "../PropertySpec";
import { StringBuffer } from "../StringBuffer";
import { TypeNames } from "../TypeNames";

describe("FileSpec", () => {
  it("generates comment at before class definition", () => {
    const spec = FileSpec.builder("Test")
      .addComment("this is a comment\n")
      .addFunction(FunctionSpec.builder("foo").build())
      .build();
    expect(emit(spec)).toMatchInlineSnapshot(`
"// this is a comment
//

function foo() {
}
"
`);
  });

  it("puts imports at the top", () => {
    const spec = FileSpec.builder("Test")
      .addFunction(
        FunctionSpec.builder("foo")
          .returns(TypeNames.anyType("@rxjs/Subscriber"))
          .build()
      )
      .addFunction(
        FunctionSpec.builder("bar")
          .returns(TypeNames.anyType("@rxjs/Observable"))
          .build()
      )
      .build();
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
