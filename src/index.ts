import { Import } from './Import';
import { Code, Def } from './Code';
import { Node } from './Node';
import { ConditionalOutput } from './ConditionalOutput';
import { isPlainObject } from './is-plain-object';
import { Literal } from './Literal';
export { Code } from './Code';
export { Import } from './Import';

/** A template literal to format code and auto-organize imports. */
export function code(literals: TemplateStringsArray, ...placeholders: unknown[]): Code {
  return new Code(
    literals,
    placeholders.map((p) => {
      if (isPlainObject(p)) {
        return literalOf(p as object);
      } else {
        return p;
      }
    })
  );
}

export function literalOf(object: unknown): Node {
  return new Literal(object);
}

export function arrayOf(...elements: unknown[]): Node {
  return literalOf(elements);
}

export function joinCode(chunks: Code[], opts: { on?: string; trim?: boolean } = {}): Code {
  const { on = '', trim = true } = opts;
  const literals: string[] = [''];
  for (let i = 0; i < chunks.length - 1; i++) {
    literals.push(on);
  }
  literals.push('');
  if (trim) {
    chunks.forEach((c) => (c.trim = true));
  }
  return new Code(literals as any, chunks);
}

/** Creates an import that will be auto-imported at the top of the output file. */
export function imp(spec: string, opts: { definedIn?: string } = {}): Import {
  const sym = Import.from(spec);
  if (opts && opts.definedIn) {
    sym.definedIn = opts.definedIn;
  }
  return sym;
}

/** Defines `symbol` as being locally defined in the file, to avoid import collisions. */
export function def(symbol: string): Def {
  return new Def(symbol);
}

/** Creates a conditionally-output code snippet. */
export function conditionalOutput(usageSite: string, declarationSite: Code): ConditionalOutput {
  return new ConditionalOutput(usageSite, declarationSite);
}
