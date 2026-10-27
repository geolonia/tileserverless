import fs from "fs";
import path from "path";
import MBTiles from "@mapbox/mbtiles";
import { getInfo, getTile } from "./lib";

// Tests for the MBTiles instance cache and error paths, using a mocked MBTiles.
jest.mock("@mapbox/mbtiles");
const MockMBTiles = MBTiles as unknown as jest.Mock;

type Behavior = {
  openError?: Error;
  infoError?: Error;
  tileError?: Error;
};
let behavior: Behavior = {};

beforeEach(() => {
  behavior = {};
  MockMBTiles.mockReset();
  MockMBTiles.mockImplementation((_uri: string, callback: (err: Error | null, mbtiles?: unknown) => void) => {
    if (behavior.openError) {
      return callback(behavior.openError);
    }
    callback(null, {
      _stat: { size: 1, mtime: new Date(0) },
      getInfo: (cb: (err: Error | null, info?: unknown) => void) =>
        behavior.infoError ? cb(behavior.infoError) : cb(null, { version: "1.0.0+cached" }),
      getTile: (_z: number, _x: number, _y: number, cb: (err: Error | null, data?: Buffer, headers?: unknown) => void) =>
        behavior.tileError ? cb(behavior.tileError) : cb(null, Buffer.from("tile"), {}),
    });
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

let counter = 0;
const newFile = () => {
  const filename = `cache-${counter++}.mbtiles`;
  fs.writeFileSync(path.join(process.env.MOUNT_PATH, filename), "");
  return filename;
};

describe("MBTiles instance cache", () => {
  it("opens the file in read-only mode", async () => {
    const filename = newFile();
    await getInfo(filename);
    expect(MockMBTiles).toHaveBeenCalledWith(
      `${process.env.MOUNT_PATH}/${filename}?mode=ro`,
      expect.any(Function),
    );
  });

  it("reuses the instance for the same file", async () => {
    const filename = newFile();
    await getInfo(filename);
    await getTile(filename, "0", "0", "0");
    expect(MockMBTiles).toHaveBeenCalledTimes(1);
  });

  it("opens the file again after it changed", async () => {
    const filename = newFile();
    await getInfo(filename);
    fs.writeFileSync(path.join(process.env.MOUNT_PATH, filename), "changed");
    await getInfo(filename);
    expect(MockMBTiles).toHaveBeenCalledTimes(2);
  });

  it("uses the filename as the cache key when the file cannot be stat-ed", async () => {
    const filename = newFile();
    const error = Object.assign(new Error("permission denied"), { code: "EACCES" });
    jest.spyOn(fs, "statSync").mockImplementation(() => { throw error; });
    await getInfo(filename);
    await getInfo(filename);
    expect(MockMBTiles).toHaveBeenCalledTimes(1);
  });

  it("does not cache an instance that failed to open", async () => {
    const filename = newFile();
    behavior.openError = new Error("open failed");
    await expect(getInfo(filename)).rejects.toThrow("open failed");
    behavior.openError = undefined;
    await getInfo(filename);
    expect(MockMBTiles).toHaveBeenCalledTimes(2);
  });

  // Known bug: the eviction never removes an instance (`for...in` iterates
  // over indices, and nothing is removed when the cache is exactly full), so
  // the cache grows without limit. Remove `.failing` when it is fixed.
  it.failing("evicts the least recently used instance when the cache is full", async () => {
    const files = Array.from({ length: 7 }, newFile);
    for (const filename of files) {
      await getInfo(filename);
    }
    MockMBTiles.mockClear();
    await getInfo(files[0]);
    expect(MockMBTiles).toHaveBeenCalledTimes(1);
  });
});

describe("error paths", () => {
  it("getInfo rejects when MBTiles fails to read the metadata", async () => {
    behavior.infoError = new Error("info failed");
    await expect(getInfo(newFile())).rejects.toThrow("info failed");
  });

  it("getTile rejects when MBTiles fails to read the tile", async () => {
    behavior.tileError = new Error("tile failed");
    await expect(getTile(newFile(), "0", "0", "0")).rejects.toThrow("tile failed");
  });
});
