import { parseTilePath } from "./lib";

it("should parse path", () => {
  const params = parseTilePath({x: "11", y: "12", z: "10"});
  expect(params).not.toBeNull();
  if (!params) {
    throw new Error('params is null')
  }
  const { z, x, y } = params;
  expect(z).toEqual("10");
  expect(x).toEqual("11");
  expect(y).toEqual("12");
});
