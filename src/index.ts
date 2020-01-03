import { SymbolSpec } from './SymbolSpecs';
import { Code, deepGenerate } from './Code';
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

export function imp(spec: string): SymbolSpec {
  return SymbolSpec.from(spec);
}
