import { StringBuffer } from './StringBuffer';

/**
 * Implements soft line wrapping on an appendable. To use, append characters using
 * [LineWrapper.append] or soft-wrapping spaces using [LineWrapper.wrappingSpace].
 */
export class LineWrapper {
  private readonly out: StringBuffer;
  private readonly indent: string;
  private readonly columnLimit: number;
  private closed = false;
  /** Characters written since the last wrapping space that haven't yet been flushed.  */
  private buffer = new StringBuffer();
  /** The number of characters since the most recent newline. Includes both out and the buffer.  */
  private column = 0;
  /** -1 if we have no buffering; otherwise the number of spaces to write after wrapping.  */
  private indentLevel = -1;
  private nextFlush?: FlushType;

  constructor(out: StringBuffer, indent: string, columnLimit: number) {
    this.out = out;
    this.indent = indent;
    this.columnLimit = columnLimit;
  }

  /** Emit `s`. This may be buffered to permit line wraps to be inserted.  */
  public append(s: string): void {
    if (this.closed) {
      throw new Error('closed');
    }

    if (this.nextFlush) {
      const nextNewline = s.indexOf('\n');

      // If s doesn't cause the current line to cross the limit, buffer it and return. We'll decide
      // whether or not we have to wrap it later.
      if (nextNewline === -1 && this.column + s.length <= this.columnLimit) {
        this.buffer.append(s);
        this.column += s.length;
        return;
      }

      // Wrap if appending s would overflow the current line.
      const wrap = nextNewline === -1 || this.column + nextNewline > this.columnLimit;
      this.flush(wrap ? FlushType.WRAP : this.nextFlush);
    }

    this.out.append(s);
    const lastNewline = s.lastIndexOf('\n');
    this.column = lastNewline !== -1 ? s.length - lastNewline - 1 : this.column + s.length;
  }

  /** Emit either a space or a newline character.  */
  public wrappingSpace(indentLevel: number): void {
    if (this.closed) {
      throw new Error('closed');
    }
    if (this.nextFlush) {
      this.flush(this.nextFlush);
    }
    this.column++;
    this.nextFlush = FlushType.SPACE;
    this.indentLevel = indentLevel;
  }

  /** Emit a newline character if the line will exceed it's limit, otherwise do nothing. */
  public zeroWidthSpace(indentLevel: number): void {
    if (this.closed) {
      throw new Error('closed');
    }
    if (this.column === 0) {
      return;
    }
    if (this.nextFlush) {
      this.flush(this.nextFlush);
    }
    this.nextFlush = FlushType.EMPTY;
    this.indentLevel = indentLevel;
  }

  /** Flush any outstanding text and forbid future writes to this line wrapper.  */
  public close(): void {
    if (this.nextFlush) {
      this.flush(this.nextFlush);
    }
    this.closed = true;
  }

  public toString(): string {
    return this.out.toString();
  }

  /** Write the space followed by any buffered text that follows it.  */
  private flush(wrap: FlushType): void {
    switch (wrap) {
      case FlushType.WRAP:
        this.out.append('\n');
        for (let i = 0; i < this.indentLevel; i++) {
          this.out.append(this.indent);
        }
        this.column = this.indentLevel * this.indent.length;
        this.column += this.buffer.toString().length;
        break;
      case FlushType.SPACE:
        this.out.append(' ');
        break;
      case FlushType.EMPTY:
        break;
    }
    this.out.append(this.buffer.toString());
    this.buffer = new StringBuffer();
    this.indentLevel = -1;
    this.nextFlush = undefined;
  }
}

enum FlushType {
  WRAP,
  SPACE,
  EMPTY,
}
