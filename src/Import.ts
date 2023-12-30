import * as path from "path";
import { Node } from "./Node";
import { last, groupBy } from "./utils";

const typeImportMarker = "(?:t:)?";
const fileNamePattern = "(?:[a-zA-Z0-9._-]+)";
const modulePattern = `@?(?:(?:${fileNamePattern}(?:/${fileNamePattern})*))`;
const identPattern = `(?:(?:[a-zA-Z][_a-zA-Z0-9.]*)|(?:[_a-zA-Z][_a-zA-Z0-9.]+))`;
export const importType = "[*@+=]";
const importPattern = `^(${typeImportMarker}${identPattern})?(${importType})(${modulePattern})`;
const sourceIdentPattern = `(?:(?:${identPattern}:)?)`;
const sourceImportPattern = `^(${typeImportMarker}${sourceIdentPattern}${identPattern})?(@)(${modulePattern})`;

/**
 * Specifies a symbol and its related origin, either via import or implicit/local declaration.
 */
export abstract class Import extends Node {
  /**
   * Parses a symbol reference pattern to create a symbol. The pattern
   * allows the simple definition of all symbol types including any possible
   * import variation. If the spec to parse does not follow the proper format
   * an implicit symbol is created from the unparsed spec.
   *
   * Pattern: `symbolName? importType modulePath`
   *
   * Where:
   *
   * - `symbolName` is any legal JS/TS symbol. If none, we use the last part of the module path as a guess.
   * - `importType` is one of `@` or `*` or `+`, where:
   *    - `@` is a named import
   *       - `Foo@bar` becomes `import { Foo } from 'bar'`
   *    - `*` is a star import,
   *       - `Foo*foo` becomes `import * as Foo from 'foo'`
   *    - `+` is an implicit import
   *       - E.g. `Foo+foo` becomes `import 'foo'`
   * - `modulePath` is a path
   *    - E.g. `<filename>(/<filename)*`
   *
   *
   * @param spec Symbol spec to parse.
   * @return Parsed symbol specification
   */
  public static from(spec: string): Import {
    let matched = spec.match(importPattern);
    if (matched === null) {
      matched = spec.match(sourceImportPattern);
    }
    if (matched != null) {
      const modulePath = matched[3];
      const kind = matched[2] || "@";
      const symbolName = matched[1] || "";
      switch (kind) {
        case "*":
          return Import.importsAll(symbolName, modulePath);
        case "@":
          const isTypeImport = symbolName.startsWith("t:");
          let exportedNames;
          if (isTypeImport) {
            exportedNames = symbolName.substring(2).split(":");
          } else {
            exportedNames = symbolName.split(":");
          }

          const exportedName = exportedNames.pop();
          const sourceExportedName = exportedNames[0];
          return Import.importsName(exportedName!, modulePath, isTypeImport, sourceExportedName);
        case "=":
          return Import.importsDefault(symbolName, modulePath);
        case "+":
          return Import.sideEffect(symbolName, modulePath);
        default:
          throw new Error("Invalid import kind character");
      }
    }
    return Import.implicit(spec);
  }

  public static fromMaybeString(spec: string | Import): Import {
    return typeof spec === "string" ? Import.from(spec) : spec;
  }

  /**
   * Defined if the symbol is typically imported from a barrel/etc. path, but is technically defined in another file.
   *
   * We need to know this in case the "this comes from the barrel" type ends up being used in the file where
   * the symbol itself is defined, i.e. we don't need an import in that case.
   */
  public definedIn?: string;

  protected constructor(public symbol: string) {
    super();
  }

  public toCodeString(): string {
    return this.symbol;
  }

  public get childNodes(): unknown[] {
    return [];
  }

  public abstract source: string | undefined;

  /**
   * Creates an import of all the modules exported symbols as a single
   * local named symbol
   *
   * e.g. `import * as Engine from 'templates';`
   *
   * @param localName The local name of the imported symbols
   * @param from The module to import the symbols from
   */
  public static importsAll(localName: string, from: string): Import {
    return new ImportsAll(localName, from);
  }

  /**
   * Creates an import of a single named symbol from the module's exported
   * symbols.
   *
   * e.g. `import { Engine } from 'templates';`
   *
   * @param exportedName The symbol that is both exported and imported
   * @param from The module the symbol is exported from
   * @param typeImport whether this is an `import type` import
   */
  public static importsName(
    exportedName: string,
    from: string,
    typeImport: boolean,
    sourceExportedName?: string,
  ): Import {
    return new ImportsName(exportedName, from, sourceExportedName, typeImport);
  }

  /**
   * Creates a symbol that is brought in as a side effect of
   * an import.
   *
   * e.g. `import 'mocha'`
   *
   * @param symbolName The symbol to be imported
   * @param from The entire import that does the augmentation
   */
  public static sideEffect(symbolName: string, from: string): Import {
    return new SideEffect(symbolName, from);
  }

  /**
   * An implied symbol that does no tracking of imports
   *
   * @param name The implicit symbol name
   */
  public static implicit(name: string): Import {
    return new Implicit(name);
  }

  /**
   * Creates an import of a single named symbol from the module's exported
   * default.
   *
   * e.g. `import Engine from 'engine';`
   *
   * @param exportedName The symbol that is both exported and imported
   * @param from The module the symbol is exported from
   */
  public static importsDefault(exportedName: string, from: string): Import {
    return new ImportsDefault(exportedName, from);
  }
}

/**
 * Non-imported symbol
 */
export class Implicit extends Import {
  constructor(symbol: string) {
    super(symbol);
  }

  source = undefined;
}

/** Common base class for imported symbols. */
export abstract class Imported extends Import {
  /** The symbol is the imported symbol, i.e. `BarClass`, and source is the path it comes from. */
  protected constructor(
    public symbol: string,
    public source: string,
  ) {
    super(source);
  }
}

/**
 * Imports a single named symbol from the module's exported
 * symbols.
 *
 * E.g.:
 *
 * `import { Engine } from 'templates'` or
 * `import { Engine as Engine2 } from 'templates'`
 */
export class ImportsName extends Imported {
  /**
   * @param symbol
   * @param source
   * @param sourceSymbol is the optional original symbol, i.e. if we're renaming the symbol it is `Engine`
   * @param typeImport whether this is an `import type` import
   */
  constructor(
    symbol: string,
    source: string,
    public sourceSymbol?: string,
    public typeImport?: boolean,
  ) {
    super(symbol, source);
  }

  public toImportPiece(): string {
    return this.sourceSymbol ? `${this.sourceSymbol} as ${this.symbol}` : this.symbol;
  }
}

/**
 * Imports a single named symbol from the module's exported
 * default.
 *
 * e.g. `import Engine from 'engine';`
 */
export class ImportsDefault extends Imported {
  constructor(symbol: string, source: string) {
    super(symbol, source);
  }
}

/**
 * Imports all of the modules exported symbols as a single
 * named symbol
 *
 * e.g. `import * as Engine from 'templates';`
 */
export class ImportsAll extends Imported {
  constructor(symbol: string, source: string) {
    super(symbol, source);
  }
}

/**
 * A symbol that is brought in as a side effect of an import.
 *
 * E.g. `from("Foo+mocha")` will add `import 'mocha'`
 */
export class SideEffect extends Imported {
  constructor(symbol: string, source: string) {
    super(symbol, source);
  }
}

/** Generates the `import ...` lines for the given `imports`. */
export function emitImports(
  imports: Import[],
  ourModulePath: string,
  importMappings: { [key: string]: string },
  forceRequireImports: string[],
  importExtensions: boolean | "js" | "ts",
): string {
  if (imports.length == 0) {
    return "";
  }

  let result = "";

  // Group the imports by source module they're imported from
  const importsByModule = groupBy(
    imports.filter(
      (it) =>
        it.source !== undefined &&
        // Ignore imports that are in our own file
        !(it instanceof ImportsName && it.definedIn && sameModule(it.definedIn, ourModulePath)),
    ),
    (it) => it.source!,
  );

  // Output each source module as one line
  Object.entries(importsByModule).forEach(([modulePath, imports]) => {
    // Skip imports from the current module
    if (sameModule(ourModulePath, modulePath)) return;
    if (modulePath in importMappings) {
      modulePath = importMappings[modulePath];
    }
    const importPath = maybeAdjustExtension(maybeRelativePath(ourModulePath, modulePath), importExtensions);

    // Output star imports individually
    unique(filterInstances(imports, ImportsAll).map((i) => i.symbol)).forEach((symbol) => {
      result += `import * as ${symbol} from '${importPath}';\n`;
    });

    // Partition named imported into `import type` vs. regular imports
    const allNames = filterInstances(imports, ImportsName);
    const names = unique(allNames.filter((i) => !i.typeImport).map((it) => it.toImportPiece()));
    const def = unique(filterInstances(imports, ImportsDefault).map((it) => it.symbol));
    if (forceRequireImports.includes(modulePath) && def.length > 0) {
      result += `import ${def[0]} = require('${importPath}');\n`;
    } else if (names.length > 0 || def.length > 0) {
      // Output named imports as a group
      const namesPart = names.length > 0 ? [`{ ${names.join(", ")} }`] : [];
      const defPart = def.length > 0 ? [def[0]] : [];
      result += `import ${[...defPart, ...namesPart].join(", ")} from '${importPath}';\n`;
    }
    const typeImports = unique(
      allNames
        .filter((i) => i.typeImport)
        .map((it) => it.toImportPiece())
        // If the `import type` is already used as a concrete import, just use that
        .filter((p) => !names.includes(p)),
    );
    if (typeImports.length > 0) {
      result += `import type { ${typeImports.join(", ")} } from '${importPath}';\n`;
    }
  });

  const sideEffectImports = groupBy(filterInstances(imports, SideEffect), (a) => a.source);
  Object.keys(sideEffectImports).forEach((it) => (result += `import '${it}';\n`));

  return result;
}

type Constructor<T> = new (...args: any[]) => T;

function filterInstances<T, U>(list: T[], t: Constructor<U>): U[] {
  return list.filter((e) => e instanceof t) as unknown as U[];
}

function unique<T>(list: T[]): T[] {
  return [...new Set(list)];
}

export function maybeRelativePath(outputPath: string, importPath: string): string {
  if (!importPath.startsWith("./")) {
    return importPath;
  }
  importPath = path.normalize(importPath);
  outputPath = path.normalize(outputPath);
  const outputPathDir = path.dirname(outputPath);
  let relativePath = path.relative(outputPathDir, importPath).split(path.sep).join(path.posix.sep);
  if (!relativePath.startsWith(".")) {
    // ensure the js compiler recognizes this is a relative path.
    relativePath = "./" + relativePath;
  }
  return relativePath;
}

const tsRe = /\.ts?/;
const tsxRe = /\.tsx?/;
const jsRe = /\.js?/;
const jsxRe = /\.jsx?/;

function maybeAdjustExtension(path: string, importExtensions: boolean | "js" | "ts"): string {
  if (importExtensions === true) {
    return path;
  } else if (importExtensions === false) {
    return path.replace(extensionRegex, "");
  } else if (importExtensions === "js") {
    return path.replace(tsRe, ".js").replace(tsxRe, ".jsx");
  } else if (importExtensions === "ts") {
    return path.replace(jsRe, ".ts").replace(jsxRe, ".tsx");
  } else {
    throw new Error("Unsupported importExtensions value ${importExtensions}");
  }
}

const extensionRegex = /\.[tj]sx?/;

/** Checks if `path1 === path2` despite minor path differences like `./foo` and `foo`. */
export function sameModule(path1: string, path2: string): boolean {
  // TypeScript: import paths ending in .js and .ts are resolved to the .ts file.
  // Check the base paths (without the .js or .ts suffix).
  const [basePath1, basePath2] = [path1, path2].map((p) => p.replace(extensionRegex, ""));
  return basePath1 === basePath2 || path.resolve(basePath1) === path.resolve(basePath2);
}
