import {SymbolReferenceTracker} from "./SymbolReferenceContainer";

/**
 * Specifies a symbol and its related origin, either via import or implicit/local declaration.
 *
 * @param value Value of the symbol
 */
export class SymbolSpec {

  constructor(public value: string) {
  }

  reference(trackedBy?: SymbolReferenceTracker): string {
    if (trackedBy) {
      trackedBy.referenced(this);
    }
    return this.value;
  }
}

/**
 * Non-imported symbol
 */
class Implicit extends SymbolSpec {
  constructor(value: string) {
    super(value);
  }

  reference(trackedBy?: SymbolReferenceTracker): string {
    return this.value;
  }
}

/**
 * Common base class for imported symbols
 */
abstract class Imported extends SymbolSpec {
  constructor(public value: string, source: string) {
    super(source);
  }
}

/**
 * Imports a single named symbol from the module's exported
 * symbols.
 *
 * e.g. `import { Engine } from 'templates';`
 */
class ImportsName extends Imported {
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
class ImportsAll extends Imported {
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
class Augmented extends Imported {
  constructor(value: string, source: string) {
    super(value, source);
  }
}

/**
 * A symbol that is brought in as a side effect of an
 * import.
 *
 * e.g. `import 'mocha'`
 */
class SideEffect extends Imported {
  constructor(value: string, source: string) {
    super(value, source);
  }
}
