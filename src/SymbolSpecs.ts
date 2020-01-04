import _ from 'lodash';
import { Node } from './Node';

const fileNamePattern = '(?:[a-zA-Z0-9._-]+)';
const modulePattern = `@?(?:(?:${fileNamePattern}(?:/${fileNamePattern})*))`;
const identPattern = `(?:(?:[a-zA-Z][_a-zA-Z0-9.]*)|(?:[_a-zA-Z][_a-zA-Z0-9.]+))`;
export const moduleSeparator = '[*@+=]';
const importPattern = `^(${identPattern})?(${moduleSeparator})(${modulePattern})(?:#(${identPattern}))?`;

/**
 * Specifies a symbol and its related origin, either via import or implicit/local declaration.
 *
 * @param value Value of the symbol
 */
export abstract class SymbolSpec extends Node {
  /**
   * Parses a symbol reference pattern to create a symbol. The pattern
   * allows the simple definition of all symbol types including any possible
   * import variation. If the spec to parse does not follow the proper format
   * an implicit symbol is created from the unparsed spec.
   *
   * Pattern: `<symbol_name>? <import_type> <module_path> (#<augmented_symbol_name>)?`
   *
   * * symbol_name = `[a-zA-Z0-9._]+`
   *
   *        Any legal compound JS/TS symbol (e.g. symbol._member.member). If no symbol name is
   *        specified then the last component of the module path is used as the symbol name;
   *        allows easy use with libraries that follow normal conventions.
   *
   * * import_type = `@ | * | +`
   *
   *        `@` = Import named symbol from module (e.g. `import { <symbol_name> } from '<module_name>'`)
   *
   *        `*` = Import all symbols from module (e.g. `*Foo` becomes `import * as Foo from 'Foo'`,
   *          `Foo*foo` becomes `import * as Foo from 'foo').
   *
   *        `+` = Symbol is declared implicitly via import of the module (e.g. `import '<module_name>'`)
   *
   * * module_path = `<filename>(/<filename)*`
   *
   *        Path name specifying the module.
   *
   * * augmented_symbol_name = `[a-zA-Z0-9_]+`
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
  public static from(spec: string): SymbolSpec {
    const matched = spec.match(importPattern);
    if (matched != null) {
      const modulePath = matched[3];
      const type = matched[2] || '@';
      const symbolName = matched[1] || (_.last(modulePath.split('/')) || '');
      const targetName = matched[4];
      switch (type) {
        case '*':
          return SymbolSpecs.importsAll(symbolName, modulePath);
        case '@':
          return SymbolSpecs.importsName(symbolName, modulePath);
        case '=':
          return SymbolSpecs.importsDefault(symbolName, modulePath);
        case '+':
          return targetName
            ? SymbolSpecs.augmented(symbolName, modulePath, targetName)
            : SymbolSpecs.sideEffect(symbolName, modulePath);
        default:
          throw new Error('Invalid type character');
      }
    }
    return SymbolSpecs.implicit(spec);
  }

  public static fromMaybeString(spec: string | SymbolSpec): SymbolSpec {
    return typeof spec === 'string' ? SymbolSpec.from(spec) : spec;
  }

  protected constructor(public value: string) {
    super();
  }

  public toCodeString(): string {
    return this.value;
  }

  public get childNodes(): unknown[] {
    return [];
  }

  public abstract source: string | undefined;
}

export class SymbolSpecs {
  /**
   * Creates an import of all the modules exported symbols as a single
   * local named symbol
   *
   * e.g. `import * as Engine from 'templates';`
   *
   * @param localName The local name of the imported symbols
   * @param from The module to import the symbols from
   */
  public static importsAll(localName: string, from: string): SymbolSpec {
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
  public static importsName(exportedName: string, from: string): SymbolSpec {
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
  public static augmented(symbolName: string, from: string, target: string): SymbolSpec {
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
  public static sideEffect(symbolName: string, from: string): SymbolSpec {
    return new SideEffect(symbolName, from);
  }

  /**
   * An implied symbol that does no tracking of imports
   *
   * @param name The implicit symbol name
   */
  public static implicit(name: string): SymbolSpec {
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
  public static importsDefault(exportedName: string, from: string): SymbolSpec {
    return new ImportsDefault(exportedName, from);
  }
}

/**
 * Non-imported symbol
 */
export class Implicit extends SymbolSpec {
  constructor(value: string) {
    super(value);
  }

  source = undefined;
}

/** Common base class for imported symbols. */
export abstract class Imported extends SymbolSpec {
  /** The value is the imported symbol, i.e. `BarClass`, and source is the path it comes from. */
  protected constructor(public value: string, public source: string) {
    super(source);
  }
}

/**
 * Imports a single named symbol from the module's exported
 * symbols.
 *
 * e.g. `import { Engine } from 'templates';`
 */
export class ImportsName extends Imported {
  constructor(value: string, source: string) {
    super(value, source);
  }
}

/**
 * Imports a single named symbol from the module's exported
 * default.
 *
 * e.g. `import Engine from 'engine';`
 */
export class ImportsDefault extends Imported {
  constructor(value: string, source: string) {
    super(value, source);
  }
}

/**
 * Imports all of the modules exported symbols as a single
 * named symbol
 *
 * e.g. `import * as Engine from 'templates';`
 */
export class ImportsAll extends Imported {
  constructor(value: string, source: string) {
    super(value, source);
  }
}

/**
 * A symbol that is brought in by a whole module import
 * that "augments" an existing symbol.
 *
 * e.g. `import 'rxjs/add/operator/flatMap'`
 */
export class Augmented extends Imported {
  constructor(value: string, source: string, public augmented: string) {
    super(value, source);
  }
}

/**
 * A symbol that is brought in as a side effect of an
 * import.
 *
 * E.g. `from("Foo+mocha")` will add `import 'mocha'`
 */
export class SideEffect extends Imported {
  constructor(value: string, source: string) {
    super(value, source);
  }
}

export function emitImports(imports: SymbolSpec[], path: string): string {
  if (imports.length == 0) {
    return '';
  }

  let result = '';
  const augmentImports = _.groupBy(filterInstances(imports, Augmented), a => a.augmented);
  const sideEffectImports = _.groupBy(filterInstances(imports, SideEffect), a => a.source);

  // FileModules.importPath(this.path, it.source)).toSortedMap()
  const m = _.groupBy(imports.filter(it => it.source !== undefined), it => it.source);

  Object.entries(m).forEach(([sourceImportPath, imports]) => {
    // Skip imports from the current module
    // if (path === sourceImportPath || Path.resolve(path) === Path.resolve(sourceImportPath)) {
    //   return;
    // }
    const importPath = maybeRelativePath(path, sourceImportPath);

    // Output star imports individually
    filterInstances(imports, ImportsAll).forEach(i => {
      result += `import * as ${i.value} from '${importPath}';\n`;
      const augments = augmentImports[i.value];
      if (augments) {
        augments.forEach(augment => (result += `import '${augment.source}';\n`));
      }
    });

    // Output named imports as a group
    const names = unique(filterInstances(imports, ImportsName).map(it => it.value));
    const def = unique(filterInstances(imports, ImportsDefault).map(it => it.value));
    if (names.length > 0 || def.length > 0) {
      const namesPart = names.length > 0 ? [`{ ${names.join(', ')} }`] : [];
      const defPart = def.length > 0 ? [def[0]] : [];
      const allNames = [...defPart, ...namesPart];
      result += `import ${allNames.join(', ')} from '${importPath}';\n`;
      [...names, ...def].forEach(name => {
        const augments = augmentImports[name];
        if (augments) {
          augments.forEach(augment => (result += `import '${augment.source}';\n`));
        }
      });
    }
  });

  Object.keys(sideEffectImports).forEach(it => (result += `import '${it}';\n`));

  return result;
}

type Constructor<T> = new (...args: any[]) => T;

function filterInstances<T, U>(list: T[], t: Constructor<U>): U[] {
  return (list.filter(e => e instanceof t) as unknown) as U[];
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
  const numberOfDirs = basePath.split('').filter(l => l === '/').length;
  if (numberOfDirs === 0) {
    return importPath;
  }
  // Make an array of `..` to get our importPath to the root directory.
  const a: string[] = new Array(numberOfDirs);
  const prefix = a.fill('..', 0, numberOfDirs).join('/');
  return prefix + importPath.substring(1);
}
