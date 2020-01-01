import prettier from 'prettier';
import { emitImports, SymbolSpec } from './SymbolSpecs';

/** A template literal to format code and auto-organize imports. */
export function code(literals: TemplateStringsArray, ...placeholders: any[]): Code {
  return new Code(literals, placeholders);
}

export class Code {
  constructor(private literals: TemplateStringsArray, private placeholders: any[]) {}

  toStringWithImports(path?: string): string {
    const imports: SymbolSpec[] = [];

    let toScan = [...this.placeholders];
    while (toScan.length > 0) {
      const placeholder = toScan.pop()!;
      if (placeholder instanceof SymbolSpec) {
        imports.push(placeholder);
      } else if (placeholder instanceof Code) {
        toScan = [...toScan, ...placeholder.placeholders];
      } else if (Array.isArray(placeholder)) {
        toScan = [...toScan, ...placeholder];
      }
    }

    const importPart = emitImports(imports, path || '');
    const bodyPart = this.toString();
    return maybePretty(importPart + '\n' + bodyPart);
  }

  /** Returns the formatted code, without any imports. */
  toString() {
    const { literals, placeholders } = this;
    let result = '';

    // interleave the literals with the placeholders
    for (let i = 0; i < placeholders.length; i++) {
      const literal = literals[i];
      const placeholder = placeholders[i];
      result += literal;
      if (placeholder instanceof SymbolSpec) {
        result += placeholder.value;
      } else if (Array.isArray(placeholder)) {
        let todo = [...placeholder];
        while (todo.length > 0) {
          const current = todo.shift();
          if (Array.isArray(current)) {
            todo = [...todo, ...current];
          } else {
            result += current.toString();
          }
        }
      } else {
        result += placeholder.toString();
      }
    }

    // add the last literal
    result += literals[literals.length - 1];

    return maybePretty(result);
  }
}

function maybePretty(input: string): string {
  try {
    return prettier.format(input.trim(), { parser: 'babel' });
  } catch (e) {
    return input; // assume it's invalid syntax and ignore
  }
}

export function imp(spec: string): SymbolSpec {
  return SymbolSpec.from(spec);
}
