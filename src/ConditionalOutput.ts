import { Node } from "./Node";
import { Code } from "./Code";

/**
 * Helps output conditional helper methods.
 *
 * The `ConditionalOutput` concept is split into a usage site and a declaration
 * site, i.e. declaring a `function someHelper() { ... }`, and calling it
 * like `someHelper()`.
 *
 * While generating code, you can make usage says by using `someHelper` as
 * a placeholder, and then output the declaration with `someHelper.ifUsed`
 * to output the declaration conditionally only if `someHelper` has been
 * seen in the tree.
 *
 * ```typescript
 * const someHelper = conditionalOutput(
 *   "someHelper",
 *   code`function someHelper() { return 1 } `
 * );
 *
 * const code = code`
 *   ${someHelper}
 *
 *   ${someHelper.ifUsed}
 * `
 * ```
 */
export class ConditionalOutput extends Node {
  // A given ConditionalOutput const could be used in multiple code
  // parents, and so we don't want to use instance state to store
  // "should I be output or not", b/c it depends on the containing tree.
  constructor(public usageSiteName: string, public declarationSiteCode: Code) {
    super();
  }

  get childNodes(): unknown[] {
    return [this.declarationSiteCode];
  }

  toCodeString(): string {
    return this.usageSiteName;
  }

  get ifUsed(): MaybeOutput {
    return new MaybeOutput(this, this.declarationSiteCode);
  }
}

export class MaybeOutput {
  constructor(public parent: ConditionalOutput, public code: Code) {}
}
