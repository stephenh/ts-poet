import { Node } from './Node';
import { emitImports, ImportsName, sameModule, SymbolSpec } from './SymbolSpecs';
import prettier, { resolveConfig } from 'prettier';
import { isPlainObject } from './is-plain-object';

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
    const ourModulePath = (path || '').replace(/\.[tj]sx?/, '');
    const imports = this.deepFindImports();
    const defs = this.deepFindDefs();
    assignAliasesIfNeeded(defs, imports, ourModulePath);
    const importPart = emitImports(imports, ourModulePath);
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
      const placeholder = todo.shift();
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

  private deepFindDefs(): Def[] {
    const defs: Def[] = [];
    let todo: unknown[] = [this];
    while (todo.length > 0) {
      const placeholder = todo.shift();
      if (placeholder instanceof Def) {
        defs.push(placeholder);
      } else if (placeholder instanceof Node) {
        todo = [...todo, ...placeholder.childNodes];
      } else if (Array.isArray(placeholder)) {
        todo = [...todo, ...placeholder];
      }
    }
    return defs;
  }

  private generateCode(): string {
    const { literals, placeholders } = this;
    let result = '';
    // interleave the literals with the placeholders
    for (let i = 0; i < placeholders.length; i++) {
      result += literals[i] + deepGenerate(placeholders[i]);
    }
    // add the last literal
    result += literals[literals.length - 1];
    return result;
  }
}

export function deepGenerate(object: unknown): string {
  let result = '';
  let todo: unknown[] = [object];
  while (todo.length > 0) {
    const current = todo.shift();
    if (Array.isArray(current)) {
      todo = [...todo, ...current];
    } else if (current instanceof Node) {
      result += current.toCodeString();
    } else if (current === null) {
      result += 'null';
    } else if (current !== undefined) {
      if (isPlainObject(current)) {
        result += JSON.stringify(current);
      } else {
        result += (current as any).toString();
      }
    } else {
      result += 'undefined';
    }
  }
  return result;
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

/** Finds any namespace collisions of a named import colliding with def and assigns the import an alias it. */
function assignAliasesIfNeeded(defs: Def[], imports: SymbolSpec[], ourModulePath: string) {
  const defNames = new Set<string>();
  defs.forEach((def) => defNames.add(def.symbol));

  // A mapping of original to assigned alias, i.e. Foo@foo --> Foo2
  const assignedAliases: Record<string, string> = {};
  let j = 1;

  imports.forEach((i) => {
    if (
      i instanceof ImportsName &&
      !(sameModule(i.source, ourModulePath) || (i.definedIn && sameModule(i.definedIn, ourModulePath)))
    ) {
      if (defNames.has(i.value)) {
        // Look for an existing alias
        const key = `${i.value}@${i.source}`;
        let alias = assignedAliases[key];
        if (!alias) {
          alias = `${i.value}${j++}`;
          assignedAliases[key] = alias;
        }
        // Move the original symbol over
        i.sourceValue = i.value;
        i.value = alias;
      }
    }
  });
}

function maybePretty(input: string): string {
  try {
    return prettier.format(input.trim(), { parser: 'typescript' });
  } catch (e) {
    return input; // assume it's invalid syntax and ignore
  }
}

/**
 * Represents a symbol defined in the current file.
 *
 * We use this to know if a symbol imported from a different file is going to
 * have a namespace collision.
 */
export class Def extends Node {
  constructor(public symbol: string) {
    super();
  }

  toCodeString(): string {
    return this.symbol;
  }

  /** Any potentially string/SymbolSpec/Code nested nodes within us. */
  get childNodes() {
    return [];
  }
}
