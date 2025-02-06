import { Node } from "./Node";
import { emitImports, ImportsName, sameModule, Import, ImportsDefault, ImportsAll } from "./Import";
import { isPlainObject } from "./is-plain-object";
import { ConditionalOutput, MaybeOutput } from "./ConditionalOutput";
import { code } from "./index";
import dprint from "dprint-node";

export type DPrintOptions = Exclude<Parameters<typeof dprint.format>[2], never>;

/** Options for `toString`, i.e. for the top-level, per-file output. */
export interface ToStringOpts {
  /** The intended file name of this code; used to know whether we can skip import statements that would be from our own file. */
  path?: string;
  /** Modules to use a CommonJS-in-ESM destructure fix for, i.e. `Foo@foo` -> `import m from "foo"; m.Foo`. */
  forceDefaultImport?: string[];
  /** Modules to use a CommonJS-in-ESM destructure fix for, i.e. `Foo@foo` -> `import * as m from "foo"; m.Foo`. */
  forceModuleImport?: string[];
  /** Modules to use the TypeScript-specific "import via require" fix, i.e. `Long=long` -> `import Long = require("long")`. */
  forceRequireImport?: string[];
  /** How to handle file extensions in imports, i.e. `import { Foo } from "./foo";` vs `import { Foo } from "./foo.js";`. */
  importExtensions?: boolean | "ts" | "js";
  /** A top-of-file prefix, i.e. eslint disable. */
  prefix?: string;
  /** dprint config settings. */
  dprintOptions?: DPrintOptions;
  /** Whether to format the source or not. */
  format?: boolean;
  /** optional importMappings */
  importMappings?: { [key: string]: string };
  /**
   * The file path (relative or absolute) to the utilities module from which all `ConditionalOutput` imports will be sourced.
   * If specified, all `ConditionalOutput` instances will be replaced with imports from this file instead of their original locations.
   */
  conditionalUtils?: string;
}

export class Code extends Node {
  // Used by joinCode
  public trim: boolean = false;
  private oneline: boolean = false;
  // Cache the unformatted results of `toString` since we're immutable.
  private code: string | undefined;
  private codeWithImports: string | undefined;

  constructor(
    private literals: TemplateStringsArray,
    private placeholders: any[],
  ) {
    super();
  }

  /** Returns the formatted code, with imports. */
  toString(opts: ToStringOpts = {}): string {
    this.codeWithImports ??= this.generateCodeWithImports(opts);
    return opts.format === false ? this.codeWithImports : maybePretty(this.codeWithImports, opts.dprintOptions);
  }

  asOneline(): Code {
    this.oneline = true;
    return this;
  }

  public get childNodes(): unknown[] {
    return this.placeholders;
  }

  /**
   * Returns the unformatted, import-less code.
   *
   * This is an internal API, see `toString` for the public API.
   */
  toCodeString(used: ConditionalOutput[]): string {
    return (this.code ??= this.generateCode(used));
  }

  /**
   * Recursively collects all `ConditionalOutput` instances used within this `Code` block.
   */
  collectConditionalOutputs(): ConditionalOutput[] {
    return this.placeholders
      .map((placeholder) => {
        if (placeholder instanceof ConditionalOutput) return placeholder;
        if (placeholder instanceof Code) return placeholder.collectConditionalOutputs();
        return null;
      })
      .flat()
      .filter((val: any): val is ConditionalOutput => !!val);
  }

  private deepFindAll(utilsUrl?: string): [ConditionalOutput[], Import[], Def[]] {
    const used: ConditionalOutput[] = [];
    const imports: Import[] = [];
    const defs: Def[] = [];
    const todo: unknown[] = [this];
    let i = 0;

    while (i < todo.length) {
      const placeholder = todo[i++];

      if (utilsUrl && placeholder instanceof ConditionalOutput) {
        imports.push(Import.importsName(placeholder.usageSiteName, utilsUrl, placeholder.isType));
        continue;
      }

      if (placeholder instanceof Node) {
        todo.push(...placeholder.childNodes);
      } else if (Array.isArray(placeholder)) {
        todo.push(...placeholder);
      }

      if (placeholder instanceof ConditionalOutput) {
        used.push(placeholder);
        todo.push(...placeholder.declarationSiteCode.childNodes);
      } else if (placeholder instanceof Import) {
        imports.push(placeholder);
      } else if (placeholder instanceof Def) {
        defs.push(placeholder);
      } else if (placeholder instanceof MaybeOutput) {
        if (used.includes(placeholder.parent)) {
          todo.push(placeholder.code);
        }
      }
    }

    return [used, imports, defs];
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

    const todo: unknown[] = [this];
    let i = 0;

    while (i < todo.length) {
      const placeholder = todo[i++];
      if (placeholder instanceof Node) {
        const array = placeholder.childNodes;
        for (let j = 0; j < array.length; j++) {
          const maybeImp = array[j]!;
          if (maybeImp instanceof ImportsName && forceDefaultImport.includes(maybeImp.source)) {
            const name = getName(maybeImp.source);
            array[j] = code`${new ImportsDefault(name, maybeImp.source)}.${maybeImp.sourceSymbol || maybeImp.symbol}`;
          } else if (maybeImp instanceof ImportsName && forceModuleImport.includes(maybeImp.source)) {
            const name = getName(maybeImp.source);
            array[j] = code`${new ImportsAll(name, maybeImp.source)}.${maybeImp.sourceSymbol || maybeImp.symbol}`;
          } else if (maybeImp instanceof ImportsDefault && forceModuleImport.includes(maybeImp.source)) {
            // Change `import DataLoader from "dataloader"` to `import * as DataLoader from "dataloader"`
            array[j] = new ImportsAll(maybeImp.symbol, maybeImp.source);
          }
        }
        todo.push(...placeholder.childNodes);
      } else if (Array.isArray(placeholder)) {
        todo.push(...placeholder);
      }
    }
  }

  private generateCode(used: ConditionalOutput[]): string {
    const { literals, placeholders } = this;
    let result = "";
    // interleave the literals with the placeholders
    for (let i = 0; i < placeholders.length; i++) {
      result += literals[i] + deepGenerate(used, placeholders[i]);
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

  private generateCodeWithImports(opts: ToStringOpts): string {
    const {
      path = "",
      forceDefaultImport,
      forceModuleImport,
      forceRequireImport = [],
      importExtensions = true,
      prefix,
      importMappings = {},
    } = opts || {};
    const ourModulePath = path.replace(/\.[tj]sx?/, "");
    if (forceDefaultImport || forceModuleImport) {
      this.deepReplaceNamedImports(forceDefaultImport || [], forceModuleImport || []);
    }
    const [used, imports, defs] = this.deepFindAll(opts.conditionalUtils);
    assignAliasesIfNeeded(defs, imports, ourModulePath);
    const importPart = emitImports(imports, ourModulePath, importMappings, forceRequireImport, importExtensions);
    const bodyPart = this.generateCode(used);
    const maybePrefix = prefix ? `${prefix}\n` : "";
    return maybePrefix + importPart + "\n" + bodyPart;
  }
}

export function deepGenerate(used: ConditionalOutput[], object: unknown): string {
  let result = "";
  let todo: unknown[] = [object];
  let i = 0;
  while (i < todo.length) {
    const current = todo[i++];
    if (Array.isArray(current)) {
      todo.push(...current);
    } else if (current instanceof Node) {
      result += current.toCodeString(used);
    } else if (current instanceof MaybeOutput) {
      if (used.includes(current.parent)) {
        result += current.code.toCodeString(used);
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

// This default options are both "prettier-ish" plus also suite the ts-poet pre-formatted
// output which is all bunched together, so we want to force braces / force new lines.
const baseOptions: DPrintOptions = {
  useTabs: false,
  useBraces: "always",
  singleBodyPosition: "nextLine",
  "arrowFunction.useParentheses": "force",
  // dprint-node uses `node: true`, which we want to undo
  "module.sortImportDeclarations": "caseSensitive",
  lineWidth: 120,
  // For some reason dprint seems to wrap lines "before it should" w/o this set (?)
  preferSingleLine: true,
};

function maybePretty(input: string, options?: DPrintOptions): string {
  try {
    return dprint.format("file.ts", input.trim(), { ...baseOptions, ...options });
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
