import { Node } from "./Node";
import { ConditionalOutput, MaybeOutput } from "./ConditionalOutput";
import { isPlainObject } from "./is-plain-object";

type Token = string | Node | MaybeOutput;

/**
 * A literal source representation of the provided object.
 */
export class Literal extends Node {
  private readonly tokens: Token[];

  constructor(object: unknown) {
    super();
    this.tokens = flatten(object);
  }

  get childNodes(): unknown[] {
    return this.tokens;
  }

  toCodeString(used: ConditionalOutput[]): string {
    return this.tokens
      .map((node) => {
        if (typeof node === "string") return node;
        if (node instanceof Node) return node.toCodeString(used);
        return "";
      })
      .join(" ");
  }
}

function flatten(o: unknown): Token[] {
  if (typeof o === "undefined") {
    return ["undefined"];
  }
  if (typeof o === "object" && o != null) {
    if (o instanceof Node || o instanceof MaybeOutput) {
      return [o];
    } else if (Array.isArray(o)) {
      const nodes: Token[] = ["["];
      for (let i = 0; i < o.length; i++) {
        if (i !== 0) nodes.push(",");
        nodes.push(...flatten(o[i]));
      }
      nodes.push("]");
      return nodes;
    } else if (isPlainObject(o)) {
      const nodes: Token[] = ["{"];
      const entries = Object.entries(o);
      for (let i = 0; i < entries.length; i++) {
        if (i !== 0) nodes.push(",");
        const [key, value] = entries[i];
        nodes.push(JSON.stringify(key), ":", ...flatten(value));
      }
      nodes.push("}");
      return nodes;
    }
  }
  return [JSON.stringify(o)];
}
