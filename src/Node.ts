export abstract class Node {
  /** Return the unformatted code for this node. */
  abstract toCodeString(): string;

  /** Any potentially string/SymbolSpec/Code nested nodes within us. */
  abstract get childNodes(): unknown[];
}
