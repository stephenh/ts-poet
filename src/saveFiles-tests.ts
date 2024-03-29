import mock from "mock-fs";
import { saveFiles } from "./saveFiles";
import { promises as fs } from "fs";

beforeEach(() => mock());
afterEach(() => mock.restore());

describe("saveFiles", () => {
  it("saves files with a hash", async () => {
    // Given a file
    const file = { name: "Author.ts", contents: "class Author {}", overwrite: true, hash: true };
    // When we call saveFiles
    await saveFiles({ directory: "./src/entities", files: [file] });
    // Then it was saved with a hash of the unformatted output
    const content = (await fs.readFile("./src/entities/Author.ts")).toString();
    expect(content).toMatchInlineSnapshot(`
      "// Generated by ts-poet (hash=bc536d.56)
      class Author {}"
    `);
    expect(content.length).toEqual(56);
  });

  it("saves files with a hash and length", async () => {
    // Given a file that is crafted to have 99 chars with the pre-length content
    const file = { name: "Author.ts", contents: "line\n".repeat(12), overwrite: true, hash: true };
    // When we call saveFiles
    await saveFiles({ directory: "./src/entities", files: [file] });
    const content = (await fs.readFile("./src/entities/Author.ts")).toString();
    // Then instead of 99 + "99".length (2) = 101, we write a length of 102
    expect(content).toMatchInlineSnapshot(`
      "// Generated by ts-poet (hash=131a2a.102)
      line
      line
      line
      line
      line
      line
      line
      line
      line
      line
      line
      line
      "
    `);
    expect(content.length).toEqual(102);
  });

  it("does not overwrite files if the hash matches", async () => {
    // Given a file that hashes to bc536d
    const file = { name: "Author.ts", contents: "class Author {}", overwrite: true, hash: true };
    // And the file already has the matching hash
    // (the length was 60, but adding `.60` makes the length 63)
    await fs.writeFile("./Author.ts", `// Generated by ts-poet (hash=bc536d.63)\n...previous content...`);
    // When we call saveFiles
    await saveFiles({ files: [file] });
    // Then we didn't re-generate the file
    expect((await fs.readFile("./Author.ts")).toString()).toMatchInlineSnapshot(`
      "// Generated by ts-poet (hash=bc536d.63)
      ...previous content..."
    `);
  });

  it("does overwrite files if the length mismatches", async () => {
    // Given a file that hashes to bc536d
    const file = { name: "Author.ts", contents: "class Author {}", overwrite: true, hash: true };
    // And then length had been 63, but someone edited to be shorter
    await fs.writeFile("./Author.ts", `// Generated by ts-poet (hash=bc536d.63)\n...previous content..`);
    // When we call saveFiles
    await saveFiles({ files: [file] });
    // Then we re-generated the file
    expect((await fs.readFile("./Author.ts")).toString()).toMatchInlineSnapshot(`
      "// Generated by ts-poet (hash=bc536d.56)
      class Author {}"
    `);
  });

  it("does overwrite files if the hash mismatches", async () => {
    // Given a file that hashes to bc536d
    const file = { name: "Author.ts", contents: "class Author {}", overwrite: true, hash: true };
    // And the hash had been `aaaaaa`
    await fs.writeFile("./Author.ts", `// Generated by ts-poet (hash=aaaaaa.63)\n...previous content..`);
    // When we call saveFiles
    await saveFiles({ files: [file] });
    // Then we re-generated the file
    expect((await fs.readFile("./Author.ts")).toString()).toMatchInlineSnapshot(`
      "// Generated by ts-poet (hash=bc536d.56)
      class Author {}"
    `);
  });

  it("creates files with overwrite: false", async () => {
    // Given a file with overwrite: false
    const file = { name: "Author.ts", contents: "class Author {}", overwrite: false };
    // When we call saveFiles w/o the file existing
    await saveFiles({ files: [file] });
    // Then we -generate the file
    expect((await fs.readFile("./Author.ts")).toString()).toEqual("class Author {}");
  });

  it("does not overwrite files if overwrite: false", async () => {
    // Given a file with overwrite: false
    const file = { name: "Author.ts", contents: "class Author {}", overwrite: false };
    // And the file already exists
    await fs.writeFile("./Author.ts", `...previous content...`);
    // When we call saveFiles
    await saveFiles({ files: [file] });
    // Then we didn't re-generate the file
    expect((await fs.readFile("./Author.ts")).toString()).toEqual("...previous content...");
  });
});
