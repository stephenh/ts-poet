import { Node } from "./Node";
import { emitImports, ImportsName, sameModule, Import, ImportsDefault, ImportsAll } from "./Import";
import { isPlainObject } from "./is-plain-object";
import { ConditionalOutput, MaybeOutput } from "./ConditionalOutput";
import { code } from "./index";

import { createFromBuffer } from "@dprint/formatter";
import { getBuffer } from "@dprint/typescript";

export type DPrintOptions = Record<string, unknown>;

const formatter = createFromBuffer(getBuffer());

// We only have a single top-level Code.toStringWithImports running at a time,
// so use a global var to capture this contextual state.
let usedConditionals: ConditionalOutput[] = [];

/** Options for `toStringWithImports`, i.e. for the top-level, per-file output. */
export interface ToStringOpts {
  /** The intended file name of this code; used to know whether we can skip import statements that would be from our own file. */
  path?: string;
  /** Modules to use a CommonJS-in-ESM destructure fix for. */
  forceDefaultImport?: string[];
  /** Modules to use a CommonJS-in-ESM destructure fix for. */
  forceModuleImport?: string[];
  /** A top-of-file prefix, i.e. eslint disable. */
  prefix?: string;
  /** dprint config settings. */
  dprintOptions?: DPrintOptions;
  /** optional importMappings */
  importMappings?: { [key: string]: string };
}

export class Code extends Node {
  // Used by joinCode
  public trim: boolean = false;
  private oneline: boolean = false;

  constructor(private literals: TemplateStringsArray, private placeholders: any[]) {
    super();
  }

  /** Returns the code with any necessary import statements prefixed. */
  toStringWithImports(opts?: ToStringOpts): Promise<string> {
    const {
      path = "",
      forceDefaultImport,
      forceModuleImport,
      prefix,
      dprintOptions = {},
      importMappings = {},
    } = opts || {};
    const ourModulePath = path.replace(/\.[tj]sx?/, "");
    if (forceDefaultImport || forceModuleImport) {
      this.deepReplaceNamedImports(forceDefaultImport || [], forceModuleImport || []);
    }
    usedConditionals = this.deepConditionalOutput();
    const imports = this.deepFindImports();
    const defs = this.deepFindDefs();
    assignAliasesIfNeeded(defs, imports, ourModulePath);
    const importPart = emitImports(imports, ourModulePath, importMappings);
    const bodyPart = this.generateCode();
    const maybePrefix = prefix ? `${prefix}\n` : "";
    return Promise.resolve(maybePretty(maybePrefix + importPart + "\n" + bodyPart, dprintOptions));
  }

  /**
   * Returns the formatted code, without any imports.
   *
   * Note that we don't use `.prettierrc` b/c that requires async I/O to resolve.
   */
  toString(): string {
    return maybePretty(this.generateCode());
  }

  asOneline(): Code {
    this.oneline = true;
    return this;
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
      } else if (placeholder instanceof MaybeOutput) {
        if (usedConditionals.includes(placeholder.parent)) {
          todo = [...todo, placeholder.code];
        }
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
      } else if (placeholder instanceof MaybeOutput) {
        if (usedConditionals.includes(placeholder.parent)) {
          todo = [...todo, placeholder.code];
        }
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

  private deepReplaceNamedImports(forceDefaultImport: string[], forceModuleImport: string[]): void {
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
          } else if (maybeImp instanceof ImportsName && forceModuleImport.includes(maybeImp.source)) {
            const name = getName(maybeImp.source);
            array[i] = code`${new ImportsAll(name, maybeImp.source)}.${maybeImp.sourceSymbol || maybeImp.symbol}`;
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
    let result = "";
    // interleave the literals with the placeholders
    for (let i = 0; i < placeholders.length; i++) {
      result += literals[i] + deepGenerate(placeholders[i]);
    }
    // add the last literal
    result += literals[literals.length - 1];
    if (this.trim) {
      result = result.trim();
    }
    if (this.oneline) {
      result = result.replace(/\n/g, "");
    }
    return result;
  }
}

export function deepGenerate(object: unknown): string {
  let result = "";
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
      result += "null";
    } else if (current !== undefined) {
      if (isPlainObject(current)) {
        result += JSON.stringify(current);
      } else {
        result += (current as any).toString();
      }
    } else {
      result += "undefined";
    }
  }
  return result;
}

/** Finds any namespace collisions of a named import colliding with def and assigns the import an alias it. */
function assignAliasesIfNeeded(defs: Def[], imports: Import[], ourModulePath: string): void {
  // Keep track of used (whether declared or imported) symbols
  const usedSymbols = new Set<string>();

  // Mark all locally-defined symbols as used
  defs.forEach((def) => usedSymbols.add(def.symbol));

  // A mapping of original to assigned alias, i.e. Foo@foo --> Foo2
  const assignedAliases: Record<string, string> = {};
  let j = 1;

  imports.forEach((i) => {
    if (
      i instanceof ImportsName &&
      // Don't both aliasing imports from our own module
      !(sameModule(i.source, ourModulePath) || (i.definedIn && sameModule(i.definedIn, ourModulePath)))
    ) {
      const key = `${i.symbol}@${i.source}`;
      if (usedSymbols.has(i.symbol)) {
        let alias = assignedAliases[key];
        if (!alias) {
          alias = `${i.symbol}${j++}`;
          assignedAliases[key] = alias;
        }
        // Move the original symbol over
        if (alias !== i.symbol) {
          i.sourceSymbol = i.symbol;
        }
        i.symbol = alias;
      } else {
        usedSymbols.add(i.symbol);
        assignedAliases[key] = i.symbol;
      }
    }
  });
}

// This default options are both "pretty-ish" plus also suite the ts-poet pre-formatted
// output which is all bunched together, so we want to force braces / force new lines.
const baseOptions: DPrintOptions = {
  useTabs: false,
  useBraces: "always",
  singleBodyPosition: "nextLine",
};

function maybePretty(input: string, options?: DPrintOptions): string {
  try {
    return formatter.formatText("file.ts", input.trim(), { ...baseOptions, ...options });
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
