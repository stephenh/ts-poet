/**
 * A really simple string buffer.
 *
 * This is not at all for performance reasons and instead just to match
 * the existing poet code/pattern.
 */
export class StringBuffer {
  private strings: string[] = [];

  public append(s: string): this {
    this.strings.push(s);
    return this;
  }

  public toString(): string {
    return this.strings.join('');
  }
}
