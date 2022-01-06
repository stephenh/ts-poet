import { code } from './index';

jest.mock('prettier', () => jest.requireActual('prettier/standalone'));

describe('standalone', () => {
  it('works with prettier/standalone', async () => {
    const b = code`1 +    1`;
    expect(await b.toStringWithImports()).toMatchInlineSnapshot(`
      "1 + 1;
      "
    `);
  });

  it('supports jsx', async () => {
    const b = code`
      const a = <div
       class="test">    Test</div>;
    `;
    expect(await b.toStringWithImports()).toMatchInlineSnapshot(`
      "const a = <div class=\\"test\\"> Test</div>;
      "
    `);
  });
});
