import { parseTilePath } from "./lib";

it("should parse path", () => {
  const params = parseTilePath("10/11/12.mvt");
  expect(params).not.toBeNull();
  // @ts-ignore
  const { z, x, y } = params;
  expect(z).toEqual("10");
  expect(x).toEqual("11");
  expect(y).toEqual("12");
});
