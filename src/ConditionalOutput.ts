import { Node } from "./Node";
import { Code } from "./Code";

/**
 * Helps output conditional helper methods.
 *
 * The `ConditionalOutput` concept is split into a usage site and a declaration
 * site, i.e. declaring a `function someHelper() { ... }`, and calling it
 * like `someHelper()`.
 *
 * While generating code, you can make usage sites by using `someHelper` as
 * a placeholder, and then output the declaration with `someHelper.ifUsed`
 * to output the declaration conditionally only if `someHelper` has been
 * seen in the tree.
 *
 * ```typescript
 * const someHelper = conditionalOutput(
 *   "someHelper",
 *   code`function someHelper(n: number) { return n * 2; } `
 * );
 *
 * const code = code`
 *   ${someHelper}(1);
 *
 *   ${someHelper.ifUsed}
 * `
 * ```
 *
 * In the above scenario, it's obvious that `someHelper` is being used, but in
 * code generators with misc configuration options and conditional output paths
 * (i.e. should I output a date helper if dates are even used for this file?)
 * it is harder to tell when exactly a helper should/should not be included.
 */
export class ConditionalOutput extends Node {
  // A given ConditionalOutput const could be used in multiple code
  // parents, and so we don't want to use instance state to store
  // "should I be output or not", b/c it depends on the containing tree.
  constructor(public usageSiteName: string, public declarationSiteCode: Code) {
    super();
  }

  /** Returns the declaration code, typically to be included near the bottom of your output as top-level scope. */
  get ifUsed(): MaybeOutput {
    return new MaybeOutput(this, this.declarationSiteCode);
  }

  get childNodes(): unknown[] {
    return [this.declarationSiteCode];
  }

  toCodeString(): string {
    return this.usageSiteName;
  }
}

export class MaybeOutput {
  constructor(public parent: ConditionalOutput, public code: Code) {}
}
