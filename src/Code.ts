import { Node } from './Node';
import { emitImports, ImportsName, sameModule, Import, ImportsDefault } from './Import';
import prettier, { resolveConfig } from 'prettier';
import { isPlainObject } from './is-plain-object';
import { ConditionalOutput, MaybeOutput } from './ConditionalOutput';
import { code } from './index';

// We only have a single top-level Code.toStringWithImports running at a time,
// so use a global var to capture this contextual state.
let usedConditionals: ConditionalOutput[] = [];

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
  toStringWithImports(opts?: { path?: string; forceDefaultImport?: string[] }): Promise<string> {
    const { path = '', forceDefaultImport } = opts || {};
    const ourModulePath = path.replace(/\.[tj]sx?/, '');
    if (forceDefaultImport) {
      this.deepReplaceNamedImports(forceDefaultImport);
    }
    const imports = this.deepFindImports();
    const defs = this.deepFindDefs();
    usedConditionals = this.deepConditionalOutput();
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

  private deepFindImports(): Import[] {
    const imports: Import[] = [];
    let todo: unknown[] = [this];
    while (todo.length > 0) {
      const placeholder = todo.shift();
      if (placeholder instanceof Import) {
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

  private deepConditionalOutput(): ConditionalOutput[] {
    const used: ConditionalOutput[] = [];
    let todo: unknown[] = [this];
    while (todo.length > 0) {
      const placeholder = todo.shift();
      if (placeholder instanceof ConditionalOutput) {
        used.push(placeholder);
        todo = [...todo, ...placeholder.declarationSiteCode.childNodes];
      } else if (placeholder instanceof Node) {
        todo = [...todo, ...placeholder.childNodes];
      } else if (Array.isArray(placeholder)) {
        todo = [...todo, ...placeholder];
      }
    }
    return used;
  }

  private deepReplaceNamedImports(forceDefaultImport: string[]): void {
    // Keep a map of module name --> symbol we're importing, i.e. protobufjs/simple is _m1
    const assignedNames: Record<string, string> = {};
    function getName(source: string): string {
      let name = assignedNames[source];
      if (!name) {
        name = `_m${Object.values(assignedNames).length}`;
        assignedNames[source] = name;
      }
      return name;
    }

    let todo: unknown[] = [this];
    while (todo.length > 0) {
      const placeholder = todo.shift();
      if (placeholder instanceof Node) {
        const array = placeholder.childNodes;
        for (let i = 0; i < array.length; i++) {
          const maybeImp = array[i]!;
          if (maybeImp instanceof ImportsName && forceDefaultImport.includes(maybeImp.source)) {
            const name = getName(maybeImp.source);
            array[i] = code`${new ImportsDefault(name, maybeImp.source)}.${maybeImp.sourceSymbol || maybeImp.symbol}`;
          }
        }
        todo = [...todo, ...placeholder.childNodes];
      } else if (Array.isArray(placeholder)) {
        todo = [...todo, ...placeholder];
      }
    }
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
    } else if (current instanceof MaybeOutput) {
      if (usedConditionals.includes(current.parent)) {
        result += current.code.toCodeString();
      }
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
function assignAliasesIfNeeded(defs: Def[], imports: Import[], ourModulePath: string): void {
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
      if (defNames.has(i.symbol)) {
        // Look for an existing alias
        const key = `${i.symbol}@${i.source}`;
        let alias = assignedAliases[key];
        if (!alias) {
          alias = `${i.symbol}${j++}`;
          assignedAliases[key] = alias;
        }
        // Move the original symbol over
        i.sourceSymbol = i.symbol;
        i.symbol = alias;
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
  get childNodes(): Node[] {
    return [];
  }
}
