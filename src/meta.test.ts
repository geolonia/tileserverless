import fs from "fs";
import { handler } from "./meta";
import { createEvent, createMbtiles, invoke } from "../__test__/helpers";

const TILES_JSON = "GET /{ver}/tiles.json";
const METADATA_JSON = "GET /{ver}/metadata.json";

const vectorLayers = [{ id: "layer", fields: { name: "String" } }];
let file: string;

beforeAll(async () => {
  file = await createMbtiles("meta", {
    info: {
      name: "meta",
      version: "1.0.0+build",
      format: "pbf",
      minzoom: 0,
      maxzoom: 14,
      vector_layers: vectorLayers,
    },
  });
  await createMbtiles("nested/meta", { info: { version: "1.0.0+build" } });
  await createMbtiles("no-format", { info: { version: "1.0.0+build" } });
});

describe("meta handler", () => {
  it("returns tiles.json", async () => {
    const resp = await invoke(handler, createEvent(TILES_JSON, { ver: "meta" }));
    const { mtime } = fs.statSync(file);

    expect(resp.statusCode).toBe(200);
    expect(resp.isBase64Encoded).toBe(false);
    expect(resp.headers).toEqual({
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
      "Last-Modified": mtime.toUTCString(),
    });

    const body = JSON.parse(resp.body as string);
    expect(body).toMatchObject({
      name: "meta",
      version: "1.0.0+build",
      format: "pbf",
      minzoom: 0,
      maxzoom: 14,
      vector_layers: vectorLayers,
      lastModified: mtime.toISOString(),
    });
    // Only the first domain of CLOUDFRONT_DOMAIN_NAME is used.
    expect(body.tiles).toEqual([
      "https://tiles.example.com/meta/tiles/{z}/{x}/{y}.pbf?v=1.0.0%2Bbuild",
    ]);
  });

  it("returns metadata.json without tile URLs", async () => {
    const resp = await invoke(handler, createEvent(METADATA_JSON, { ver: "meta" }));
    expect(resp.statusCode).toBe(200);

    const body = JSON.parse(resp.body as string);
    expect(body.tiles).toEqual([]);
    expect(body.vector_layers).toEqual(vectorLayers);
  });

  it("keeps `$` of the version in tile URLs", async () => {
    const resp = await invoke(handler, createEvent(TILES_JSON, { ver: "nested$meta" }));
    const body = JSON.parse(resp.body as string);
    expect(body.tiles[0]).toMatch(/^https:\/\/tiles\.example\.com\/nested\$meta\/tiles\//);
  });

  it("omits the extension when the tileset has no format", async () => {
    const resp = await invoke(handler, createEvent(TILES_JSON, { ver: "no-format" }));
    const body = JSON.parse(resp.body as string);
    expect(body.tiles).toEqual([
      "https://tiles.example.com/no-format/tiles/{z}/{x}/{y}?v=1.0.0%2Bbuild",
    ]);
  });

  it("returns 404 without a version", async () => {
    const resp = await invoke(handler, createEvent(TILES_JSON));
    expect(resp.statusCode).toBe(404);
  });

  it("returns 404 when the tileset does not exist", async () => {
    const resp = await invoke(handler, createEvent(TILES_JSON, { ver: "missing" }));
    expect(resp.statusCode).toBe(404);
  });

  it("throws on an unknown route", async () => {
    await expect(invoke(handler, createEvent("GET /{ver}/unknown", { ver: "meta" })))
      .rejects.toThrow("routekey was not found");
  });
});
