import prettier, { resolveConfig } from 'prettier';
import { emitImports, SymbolSpec } from './SymbolSpecs';
import { Node } from './Node';

/** A template literal to format code and auto-organize imports. */
export function code(literals: TemplateStringsArray, ...placeholders: any[]): Code {
  return new Code(literals, placeholders);
}

export class Code extends Node {
  constructor(private literals: TemplateStringsArray, private placeholders: any[]) {
    super();
  }

  /**
   * Returns the code with any necessary import statements prefixed.
   *
   * `path` is the intended file name of this code; it is used to know whether we
   * can skip import statements that would important from our own file.
   *
   * This method will also use any local `.prettierrc` settings, hence needs
   * to return a `Promise<String>`.
   */
  toStringWithImports(path?: string): Promise<string> {
    const imports = this.deepFindImports();
    const importPart = emitImports(imports, path || '');
    const bodyPart = this.generateCode();
    return maybePrettyWithConfig(importPart + '\n' + bodyPart);
  }

  /**
   * Returns the formatted code, without any imports.
   *
   * Note that we don't use `.prettierrc` b/c that requires async I/O to resolve.
   */
  toString(): string {
    return maybePretty(this.generateCode());
  }

  public get childNodes(): unknown[] {
    return this.placeholders;
  }

  toCodeString(): string {
    return this.generateCode();
  }

  private deepFindImports(): SymbolSpec[] {
    const imports: SymbolSpec[] = [];
    let todo: unknown[] = [this];
    while (todo.length > 0) {
      const placeholder = todo.pop()!;
      if (placeholder instanceof SymbolSpec) {
        imports.push(placeholder);
      } else if (placeholder instanceof Node) {
        todo = [...todo, ...placeholder.childNodes];
      } else if (Array.isArray(placeholder)) {
        todo = [...todo, ...placeholder];
      }
    }
    return imports;
  }

  private generateCode(): string {
    const { literals, placeholders } = this;
    let result = '';
    // interleave the literals with the placeholders
    for (let i = 0; i < placeholders.length; i++) {
      const literal = literals[i];
      const placeholder = placeholders[i];
      result += literal;
      let todo = [placeholder];
      while (todo.length > 0) {
        const current = todo.shift();
        if (Array.isArray(current)) {
          todo = [...todo, ...current];
        } else if (current instanceof Node) {
          result += current.toCodeString();
        } else {
          result += current.toString();
        }
      }
    }
    // add the last literal
    result += literals[literals.length - 1];
    return result;
  }
}

const configPromise = resolveConfig('./');

async function maybePrettyWithConfig(input: string): Promise<string> {
  try {
    const config = await configPromise;
    return prettier.format(input.trim(), { parser: 'typescript', ...config });
  } catch (e) {
    return input; // assume it's invalid syntax and ignore
  }
}

function maybePretty(input: string): string {
  try {
    return prettier.format(input.trim(), { parser: 'typescript' });
  } catch (e) {
    return input; // assume it's invalid syntax and ignore
  }
}

export function imp(spec: string): SymbolSpec {
  return SymbolSpec.from(spec);
}
