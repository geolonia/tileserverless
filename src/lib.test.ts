import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  errorResponse,
  getInfo,
  getMbtilesFilename,
  getTile,
  parseTilePath,
} from "./lib";
import { createMbtiles, vectorTileData } from "../__test__/helpers";

const fingerprintOf = (file: string) => {
  const stat = fs.statSync(file);
  return crypto
    .createHash("md5")
    .update(stat.size + "-" + Number(stat.mtime))
    .digest("hex");
};

describe("errorResponse", () => {
  it("returns a JSON error response", () => {
    expect(errorResponse(404, "not found")).toEqual({
      statusCode: 404,
      isBase64Encoded: false,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0",
      },
      body: JSON.stringify({ status: 404, message: "not found" }),
    });
  });

  it("drops the message for 204", () => {
    const resp = errorResponse(204, "no content");
    expect(JSON.parse(resp.body)).toEqual({ status: 204, message: "" });
  });
});

describe("parseTilePath", () => {
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

  it.each([["2.pbf"], ["2.mvt"], ["2.png"], ["2.webp"], ["2.jpg"]])("keeps the extension of y: %s", (y) => {
    expect(parseTilePath({x: "1", y, z: "3"})).toEqual({x: "1", y, z: "3"});
  });

  it("returns null without parameters", () => {
    expect(parseTilePath(undefined)).toBeNull();
  });

  it.each([
    ["all are invalid", {x: "a", y: "-1", z: "b"}],
    ["x is missing", {y: "1", z: "1"}],
    ["y is missing", {x: "1", z: "1"}],
    ["z is missing", {x: "1", y: "1"}],
    ["x is not a number", {x: "a", y: "1", z: "1"}],
    ["x is negative", {x: "-1", y: "1", z: "1"}],
    ["x has trailing characters", {x: "1abc", y: "1", z: "1"}],
    ["x has an extension", {x: "1.pbf", y: "1", z: "1"}],
    ["y is negative", {x: "1", y: "-1", z: "1"}],
    ["y has trailing characters", {x: "1", y: "1abc", z: "1"}],
    ["y has an empty extension", {x: "1", y: "1.", z: "1"}],
    ["y has two extensions", {x: "1", y: "1.pbf.gz", z: "1"}],
    ["y is a decimal", {x: "1", y: "0.5", z: "1"}],
    ["y has an extension starting with a digit", {x: "1", y: "1.5x", z: "1"}],
    ["z has trailing characters", {x: "1", y: "1", z: "1abc"}],
    ["z is a decimal", {x: "1", y: "1", z: "1.5"}],
  ])("returns null when %s", (_, params) => {
    expect(parseTilePath(params)).toBeNull();
  });
});

describe("getMbtilesFilename", () => {
  beforeAll(async () => {
    await createMbtiles("simple");
    await createMbtiles("nested/dir/tileset");
    // A tileset outside of MOUNT_PATH, which must not be reachable.
    fs.writeFileSync(path.join(process.env.MOUNT_PATH, "..", "outside.mbtiles"), "");
  });

  it("returns the filename relative to MOUNT_PATH", async () => {
    expect(await getMbtilesFilename("simple")).toBe("simple.mbtiles");
  });

  it("maps `$` to a directory separator", async () => {
    expect(await getMbtilesFilename("nested$dir$tileset")).toBe("nested/dir/tileset.mbtiles");
  });

  it("returns null when the file does not exist", async () => {
    expect(await getMbtilesFilename("missing")).toBeNull();
  });

  it.each([
    ["..$outside"],
    ["../outside"],
    ["nested$..$..$..$outside"],
  ])("does not resolve %s outside of MOUNT_PATH", async (version) => {
    expect(await getMbtilesFilename(version)).toBeNull();
  });
});

describe("getInfo", () => {
  it("adds a fingerprint to the version", async () => {
    const file = await createMbtiles("info-version", {
      info: { name: "test", version: "2.0.0", format: "pbf", minzoom: 0, maxzoom: 14 },
    });
    const info = await getInfo("info-version.mbtiles");
    expect(info.version).toBe(`2.0.0+${fingerprintOf(file)}`);
    expect(info.name).toBe("test");
    expect(info.format).toBe("pbf");
    expect(info.minzoom).toBe(0);
    expect(info.maxzoom).toBe(14);
  });

  it("uses 1.0.0 when the tileset has no version", async () => {
    const file = await createMbtiles("info-no-version", { info: { name: "test" } });
    const info = await getInfo("info-no-version.mbtiles");
    expect(info.version).toBe(`1.0.0+${fingerprintOf(file)}`);
  });

  it("keeps a version that already has build information", async () => {
    await createMbtiles("info-build", { info: { version: "3.0.0+abc" } });
    const info = await getInfo("info-build.mbtiles");
    expect(info.version).toBe("3.0.0+abc");
  });

  it("does not add the fingerprint twice", async () => {
    const file = await createMbtiles("info-twice", { info: { version: "1.2.3" } });
    await getInfo("info-twice.mbtiles");
    const info = await getInfo("info-twice.mbtiles");
    expect(info.version).toBe(`1.2.3+${fingerprintOf(file)}`);
  });

  it("rejects when the file does not exist", async () => {
    await expect(getInfo("missing.mbtiles")).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("getTile", () => {
  const data = vectorTileData("0/0/0");

  beforeAll(async () => {
    await createMbtiles("tiles", { tiles: [{ z: 0, x: 0, y: 0, data }] });
  });

  it("returns the tile data and headers", async () => {
    const { data: tile, headers } = await getTile("tiles.mbtiles", "0", "0", "0");
    expect(tile.equals(data)).toBe(true);
    expect(headers["Content-Type"]).toBe("application/x-protobuf");
    expect(headers["Content-Encoding"]).toBe("gzip");
  });

  it("rejects when the tile does not exist", async () => {
    await expect(getTile("tiles.mbtiles", "1", "0", "0")).rejects.toThrow("Tile does not exist");
  });
});
