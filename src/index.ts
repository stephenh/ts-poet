import { SymbolSpec } from './SymbolSpecs';
import { Code, deepGenerate, Def } from './Code';
import { Node } from './Node';
export { Code } from './Code';

/** A template literal to format code and auto-organize imports. */
export function code(literals: TemplateStringsArray, ...placeholders: unknown[]): Code {
  return new Code(literals, placeholders);
}

export function arrayOf(...elements: unknown[]): Node {
  return new (class extends Node {
    get childNodes(): unknown[] {
      return elements;
    }

    toCodeString(): string {
      return '[' + elements.map(deepGenerate).join(', ') + ']';
    }
  })();
}

/** Creates an import that will be auto-imported at the top of the output file. */
export function imp(spec: string, opts: { definedIn?: string } = {}): SymbolSpec {
  return SymbolSpec.from(spec);
}

/** Defines `symbol` as being locally defined in the file, to avoid import collisions. */
export function def(symbol: string): Def {
  return new Def(symbol);
}
