import {StringBuffer} from "sb-js/lib/sb-js";
import {LineWrapper} from "../LineWrapper";

describe("LineWrapper", () => {

  it("wrap", () => {
    const out = new StringBuffer("");
    const lineWrapper = new LineWrapper(out, "  ", 10);
    lineWrapper.append("abcde");
    lineWrapper.wrappingSpace(2);
    lineWrapper.append("fghij");
    lineWrapper.close();
    expect(out.toString()).toEqual("abcde\n    fghij");
  });

  it("noWrap", () => {
    const out = new StringBuffer("");
    const lineWrapper = new LineWrapper(out, "  ", 10);
    lineWrapper.append("abcde");
    lineWrapper.wrappingSpace(2);
    lineWrapper.append("fghi");
    lineWrapper.close();
    expect(out.toString()).toEqual("abcde fghi");
  });

  it("zeroWidthNoWrap", () => {
    const out = new StringBuffer("");
    const lineWrapper = new LineWrapper(out, "  ", 10);
    lineWrapper.append("abcde");
    lineWrapper.zeroWidthSpace(2);
    lineWrapper.append("fghij");
    lineWrapper.close();
    expect(out.toString()).toEqual("abcdefghij");
  });

  it("nospaceWrapMax", () => {
    const out = new StringBuffer("");
    const lineWrapper = new LineWrapper(out, "  ", 10);
    lineWrapper.append("abcde");
    lineWrapper.zeroWidthSpace(2);
    lineWrapper.append("fghijk");
    lineWrapper.close();
    expect(out.toString()).toEqual("abcde\n    fghijk");
  });

  it("multipleWrite", () => {
    const out = new StringBuffer("");
    const lineWrapper = new LineWrapper(out, "  ", 10);
    lineWrapper.append("ab");
    lineWrapper.wrappingSpace(1);
    lineWrapper.append("cd");
    lineWrapper.wrappingSpace(1);
    lineWrapper.append("ef");
    lineWrapper.wrappingSpace(1);
    lineWrapper.append("gh");
    lineWrapper.wrappingSpace(1);
    lineWrapper.append("ij");
    lineWrapper.wrappingSpace(1);
    lineWrapper.append("kl");
    lineWrapper.wrappingSpace(1);
    lineWrapper.append("mn");
    lineWrapper.wrappingSpace(1);
    lineWrapper.append("op");
    lineWrapper.wrappingSpace(1);
    lineWrapper.append("qr");
    lineWrapper.close();
    expect(out.toString()).toEqual("ab cd ef\n  gh ij kl\n  mn op qr");
  });

  it("fencepost", () => {
    const out = new StringBuffer("");
    const lineWrapper = new LineWrapper(out, "  ", 10);
    lineWrapper.append("abcde");
    lineWrapper.append("fghij");
    lineWrapper.wrappingSpace(2);
    lineWrapper.append("k");
    lineWrapper.append("lmnop");
    lineWrapper.close();
    expect(out.toString()).toEqual("abcdefghij\n    klmnop");
  });

  it("fencepostZeroWidth", () => {
    const out = new StringBuffer("");
    const lineWrapper = new LineWrapper(out, "  ", 10);
    lineWrapper.append("abcde");
    lineWrapper.append("fghij");
    lineWrapper.zeroWidthSpace(2);
    lineWrapper.append("k");
    lineWrapper.append("lmnop");
    lineWrapper.close();
    expect(out.toString()).toEqual("abcdefghij\n    klmnop");
  });

  it("overlyLongLinesWithoutLeadingSpace", () => {
    const out = new StringBuffer("");
    const lineWrapper = new LineWrapper(out, "  ", 10);
    lineWrapper.append("abcdefghijkl");
    lineWrapper.close();
    expect(out.toString()).toEqual("abcdefghijkl");
  });

  it("overlyLongLinesWithLeadingSpace", () => {
    const out = new StringBuffer("");
    const lineWrapper = new LineWrapper(out, "  ", 10);
    lineWrapper.wrappingSpace(2);
    lineWrapper.append("abcdefghijkl");
    lineWrapper.close();
    expect(out.toString()).toEqual("\n    abcdefghijkl");
  });

  it("overlyLongLinesWithLeadingZeroWidth", () => {
    const out = new StringBuffer("");
    const lineWrapper = new LineWrapper(out, "  ", 10);
    lineWrapper.zeroWidthSpace(2);
    lineWrapper.append("abcdefghijkl");
    lineWrapper.close();
    expect(out.toString()).toEqual("abcdefghijkl");
  });

  it("noWrapEmbeddedNewlines", () => {
    const out = new StringBuffer("");
    const lineWrapper = new LineWrapper(out, "  ", 10);
    lineWrapper.append("abcde");
    lineWrapper.wrappingSpace(2);
    lineWrapper.append("fghi\njklmn");
    lineWrapper.append("opqrstuvwxy");
    lineWrapper.close();
    expect(out.toString()).toEqual("abcde fghi\njklmnopqrstuvwxy");
  });

  it("wrapEmbeddedNewlines", () => {
    const out = new StringBuffer("");
    const lineWrapper = new LineWrapper(out, "  ", 10);
    lineWrapper.append("abcde");
    lineWrapper.wrappingSpace(2);
    lineWrapper.append("fghij\nklmn");
    lineWrapper.append("opqrstuvwxy");
    lineWrapper.close();
    expect(out.toString()).toEqual("abcde\n    fghij\nklmnopqrstuvwxy");
  });

  it("noWrapEmbeddedNewlines_ZeroWidth", () => {
    const out = new StringBuffer("");
    const lineWrapper = new LineWrapper(out, "  ", 10);
    lineWrapper.append("abcde");
    lineWrapper.zeroWidthSpace(2);
    lineWrapper.append("fghij\nklmn");
    lineWrapper.append("opqrstuvwxyz");
    lineWrapper.close();
    expect(out.toString()).toEqual("abcdefghij\nklmnopqrstuvwxyz");
  });

  it("wrapEmbeddedNewlines_ZeroWidth", () => {
    const out = new StringBuffer("");
    const lineWrapper = new LineWrapper(out, "  ", 10);
    lineWrapper.append("abcde");
    lineWrapper.zeroWidthSpace(2);
    lineWrapper.append("fghijk\nlmn");
    lineWrapper.append("opqrstuvwxy");
    lineWrapper.close();
    expect(out.toString()).toEqual("abcde\n    fghijk\nlmnopqrstuvwxy");
  });

  it("noWrapMultipleNewlines", () => {
    const out = new StringBuffer("");
    const lineWrapper = new LineWrapper(out, "  ", 10);
    lineWrapper.append("abcde");
    lineWrapper.wrappingSpace(2);
    lineWrapper.append("fghi\nklmnopq\nr");
    lineWrapper.wrappingSpace(2);
    lineWrapper.append("stuvwxyz");
    lineWrapper.close();
    expect(out.toString()).toEqual("abcde fghi\nklmnopq\nr stuvwxyz");
  });

  it("wrapMultipleNewlines", () => {
    const out = new StringBuffer("");
    const lineWrapper = new LineWrapper(out, "  ", 10);
    lineWrapper.append("abcde");
    lineWrapper.wrappingSpace(2);
    lineWrapper.append("fghi\nklmnopq\nrs");
    lineWrapper.wrappingSpace(2);
    lineWrapper.append("tuvwxyz1");
    lineWrapper.close();
    expect(out.toString()).toEqual("abcde fghi\nklmnopq\nrs\n    tuvwxyz1");
  });

});
