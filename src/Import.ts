import _ from 'lodash';
import Path from 'path';
import { Node } from './Node';

const fileNamePattern = '(?:[a-zA-Z0-9._-]+)';
const modulePattern = `@?(?:(?:${fileNamePattern}(?:/${fileNamePattern})*))`;
const identPattern = `(?:(?:[a-zA-Z][_a-zA-Z0-9.]*)|(?:[_a-zA-Z][_a-zA-Z0-9.]+))`;
export const importType = '[*@+=]';
const importPattern = `^(${identPattern})?(${importType})(${modulePattern})(?:#(${identPattern}))?`;

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
   * Pattern: `symbolName? importType modulePath (#<augmentedSymbolName>)?`
   *
   * Where:
   *
   * - `symbolName` is any legal JS/TS symbol. If none, we use the last part of the module path as a guess.
   * - `importType` is one of `@` or `*` or `+`, where:
   *    - `@` is a named import
   *       - `Foo@bar` becomes `import { Foo } from 'bar'`
   *    - `*` is a star import,
   *       - `*Foo` becomes `import * as Foo from 'Foo'`
   *       - `Foo*foo` becomes `import * as Foo from 'foo'`
   *    - `+` is an implicit import
   *       - E.g. `Foo+foo` becomes `import 'foo'`
   * - `modulePath` is a path
   *    - E.g. `<filename>(/<filename)*`
   * - augmentedSymbolName = `[a-zA-Z0-9_]+`
   *
   *        Any valid symbol name that represents the symbol that is being augmented. For example,
   *        the import `rxjs/add/observable/from` attaches the `from` method to the `Observable` class.
   *        To import it correctly the spec should be `+rxjs/add/observable/from#Observable`. Adding this
   *        parameter to augmented imports ensures they are output only when the symbol being augmented
   *        is actually used.
   *
   *
   * @param spec Symbol spec to parse.
   * @return Parsed symbol specification
   */
  public static from(spec: string): Import {
    const matched = spec.match(importPattern);
    if (matched != null) {
      const modulePath = matched[3];
      const type = matched[2] || '@';
      const symbolName = matched[1] || _.last(modulePath.split('/')) || '';
      const targetName = matched[4];
      switch (type) {
        case '*':
          return Import.importsAll(symbolName, modulePath);
        case '@':
          return Import.importsName(symbolName, modulePath);
        case '=':
          return Import.importsDefault(symbolName, modulePath);
        case '+':
          return targetName
            ? Import.augmented(symbolName, modulePath, targetName)
            : Import.sideEffect(symbolName, modulePath);
        default:
          throw new Error('Invalid type character');
      }
    }
    return Import.implicit(spec);
  }

  public static fromMaybeString(spec: string | Import): Import {
    return typeof spec === 'string' ? Import.from(spec) : spec;
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
   */
  public static importsName(exportedName: string, from: string): Import {
    return new ImportsName(exportedName, from);
  }

  /**
   * Creates a symbol that is brought in by a whole module import
   * that "augments" an existing symbol.
   *
   * e.g. `import 'rxjs/add/operator/flatMap'`
   *
   * @param symbolName The augmented symbol to be imported
   * @param from The entire import that does the augmentation
   * @param target The symbol that is augmented
   */
  public static augmented(symbolName: string, from: string, target: string): Import {
    return new Augmented(symbolName, from, target);
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
  protected constructor(public symbol: string, public source: string) {
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
   * @param sourceSymbol is the optional original symbol, i.e if we're renaming the symbol it is `Engine`
   */
  constructor(symbol: string, source: string, public sourceSymbol?: string) {
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
 * A symbol that is brought in by a whole module import
 * that "augments" an existing symbol.
 *
 * e.g. `import 'rxjs/add/operator/flatMap'`
 */
export class Augmented extends Imported {
  constructor(symbol: string, source: string, public augmented: string) {
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
export function emitImports(imports: Import[], ourModulePath: string): string {
  if (imports.length == 0) {
    return '';
  }

  let result = '';

  const augmentImports = _.groupBy(filterInstances(imports, Augmented), (a) => a.augmented);

  // Group the imports by source module they're imported from
  const importsByModule = _.groupBy(
    imports.filter(
      (it) =>
        it.source !== undefined &&
        !(it instanceof ImportsName && it.definedIn && sameModule(it.definedIn, ourModulePath))
    ),
    (it) => it.source
  );

  // Output each source module as one line
  Object.entries(importsByModule).forEach(([modulePath, imports]) => {
    // Skip imports from the current module
    if (sameModule(ourModulePath, modulePath)) {
      return;
    }
    const importPath = maybeRelativePath(ourModulePath, modulePath);

    // Output star imports individually
    filterInstances(imports, ImportsAll).forEach((i) => {
      result += `import * as ${i.symbol} from '${importPath}';\n`;
      const augments = augmentImports[i.symbol];
      if (augments) {
        augments.forEach((augment) => (result += `import '${augment.source}';\n`));
      }
    });

    // Output named imports as a group
    const names = unique(filterInstances(imports, ImportsName).map((it) => it.toImportPiece()));
    const def = unique(filterInstances(imports, ImportsDefault).map((it) => it.symbol));
    if (names.length > 0 || def.length > 0) {
      const namesPart = names.length > 0 ? [`{ ${names.join(', ')} }`] : [];
      const defPart = def.length > 0 ? [def[0]] : [];
      result += `import ${[...defPart, ...namesPart].join(', ')} from '${importPath}';\n`;
      [...names, ...def].forEach((name) => {
        const augments = augmentImports[name];
        if (augments) {
          augments.forEach((augment) => (result += `import '${augment.source}';\n`));
        }
      });
    }
  });

  const sideEffectImports = _.groupBy(filterInstances(imports, SideEffect), (a) => a.source);
  Object.keys(sideEffectImports).forEach((it) => (result += `import '${it}';\n`));

  return result;
}

type Constructor<T> = new (...args: any[]) => T;

function filterInstances<T, U>(list: T[], t: Constructor<U>): U[] {
  return (list.filter((e) => e instanceof t) as unknown) as U[];
}

function unique<T>(list: T[]): T[] {
  return [...new Set(list)];
}

export function maybeRelativePath(outputPath: string, importPath: string): string {
  if (!importPath.startsWith('./')) {
    return importPath;
  }
  // Drop the `./` prefix from the outputPath if it exists.
  const basePath = outputPath.replace(/^.\//, '');
  // Ideally we'd use a path library to do all this.
  const numberOfDirs = basePath.split('').filter((l) => l === '/').length;
  if (numberOfDirs === 0) {
    return importPath;
  }
  // Make an array of `..` to get our importPath to the root directory.
  const a: string[] = new Array(numberOfDirs);
  const prefix = a.fill('..', 0, numberOfDirs).join('/');
  return prefix + importPath.substring(1);
}

/** Checks if `path1 === path2` despite minor path differences like `./foo` and `foo`. */
export function sameModule(path1: string, path2: string): boolean {
  return path1 === path2 || Path.resolve(path1) === Path.resolve(path2);
}
