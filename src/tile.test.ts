import { handler } from "./tile";
import { createEvent, createMbtiles, invoke, vectorTileData } from "../__test__/helpers";

const ROUTE = "GET /{ver}/tiles/{z}/{x}/{y}";
const DEFAULT_HEADERS = {
  "Cache-Control": "public, max-age=604800, immutable",
  "Access-Control-Allow-Origin": "*",
  "X-Frame-Options": "SAMEORIGIN",
  "Access-Control-Allow-Methods": "GET, HEAD",
  "Access-Control-Allow-Headers": "Content-Type",
};

const data = vectorTileData("1/1/0");

beforeAll(async () => {
  await createMbtiles("tile", { tiles: [{ z: 1, x: 1, y: 0, data }] });
});

describe("tile handler", () => {
  it.each([
    ["without extension", "0"],
    ["with extension", "0.pbf"],
  ])("returns the tile %s", async (_, y) => {
    const resp = await invoke(handler, createEvent(ROUTE, { ver: "tile", z: "1", x: "1", y }));

    expect(resp.statusCode).toBe(200);
    expect(resp.isBase64Encoded).toBe(true);
    expect(Buffer.from(resp.body as string, "base64").equals(data)).toBe(true);
    expect(resp.headers).toMatchObject({
      ...DEFAULT_HEADERS,
      "Content-Type": "application/x-protobuf",
      "Content-Encoding": "gzip",
    });
    expect(resp.headers).toHaveProperty("Last-Modified");
    expect(resp.headers).toHaveProperty("ETag");
  });

  it("returns 204 when the tile does not exist", async () => {
    const resp = await invoke(handler, createEvent(ROUTE, { ver: "tile", z: "1", x: "0", y: "0" }));
    expect(resp).toEqual({
      headers: DEFAULT_HEADERS,
      statusCode: 204,
      body: "",
    });
  });

  it("returns 404 without a version", async () => {
    const resp = await invoke(handler, createEvent(ROUTE));
    expect(resp.statusCode).toBe(404);
  });

  it("returns 404 when the tileset does not exist", async () => {
    const resp = await invoke(handler, createEvent(ROUTE, { ver: "missing", z: "0", x: "0", y: "0" }));
    expect(resp.statusCode).toBe(404);
  });

  it("returns 400 for invalid coordinates", async () => {
    const resp = await invoke(handler, createEvent(ROUTE, { ver: "tile", z: "a", x: "b", y: "c" }));
    expect(resp.statusCode).toBe(400);
    expect(JSON.parse(resp.body as string).message).toBe("invalid Parameters.");
  });
});
