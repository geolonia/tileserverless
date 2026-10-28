import MBTiles from "@mapbox/mbtiles";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyStructuredResultV2,
  Context,
} from "aws-lambda";

// The write API of @mapbox/mbtiles is not declared in src/global.d.ts.
interface WritableMBTiles {
  startWriting(callback: (err: Error | null) => void): void;
  stopWriting(callback: (err: Error | null) => void): void;
  putInfo(data: { [key: string]: unknown }, callback: (err: Error | null) => void): void;
  putTile(z: number, x: number, y: number, data: Buffer, callback: (err: Error | null) => void): void;
  close(callback: (err: Error | null) => void): void;
}

export interface FixtureTile {
  z: number;
  x: number;
  y: number;
  data: Buffer;
}

export interface FixtureOptions {
  info?: { [key: string]: unknown };
  tiles?: FixtureTile[];
}

// Gzipped data is detected as a gzipped protobuf tile by @mapbox/tiletype.
export const vectorTileData = (content = "tile") => zlib.gzipSync(Buffer.from(content));

const promisify = (fn: (cb: (err: Error | null) => void) => void) =>
  new Promise<void>((resolve, reject) => fn((err) => (err ? reject(err) : resolve())));

// Creates `<MOUNT_PATH>/<name>.mbtiles`. `name` may contain `/` for subdirectories.
export const createMbtiles = async (name: string, options: FixtureOptions = {}) => {
  const file = path.join(process.env.MOUNT_PATH, `${name}.mbtiles`);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const mbtiles = await new Promise<WritableMBTiles>((resolve, reject) => {
    new MBTiles(`${file}?mode=rwc`, (err, instance) => {
      if (err || !instance) return reject(err);
      resolve(instance as unknown as WritableMBTiles);
    });
  });
  await promisify((cb) => mbtiles.startWriting(cb));
  await promisify((cb) => mbtiles.putInfo(options.info || {}, cb));
  for (const { z, x, y, data } of options.tiles || []) {
    await promisify((cb) => mbtiles.putTile(z, x, y, data, cb));
  }
  await promisify((cb) => mbtiles.stopWriting(cb));
  await promisify((cb) => mbtiles.close(cb));
  return file;
};

export const createEvent = (
  routeKey: string,
  pathParameters?: { [key: string]: string },
) => ({ routeKey, pathParameters } as unknown as APIGatewayProxyEventV2);

export const invoke = async (handler: APIGatewayProxyHandlerV2, event: APIGatewayProxyEventV2) => {
  const result = await handler(event, {} as Context, () => undefined);
  return result as APIGatewayProxyStructuredResultV2;
};
