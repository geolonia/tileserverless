// @ts-ignore
import MBTiles from "@mapbox/mbtiles";
import zlib from "zlib";
const { MOUNT_PATH, DEFAULT_MBTILES_FILENAME } = process.env;

export const errorResponse = (status: number, message: string) =>
  JSON.stringify({
    status,
    message: status === 204 ? "" : message,
  });

export const parseTilePath = (proxy: string) => {
  const match = proxy.match(/^(?<z>[0-9]+)\/(?<x>[0-9]+)\/(?<y>[0-9]+)\.mvt$/);
  if (!match) {
    return null;
  }

  const { x, y, z } = match.groups as {
    x: string;
    y: string;
    z: string;
  };
  const invalidTileXYZ = [x, y, z].every((val) => {
    const num = parseInt(val, 10);
    return Number.isNaN(num) || num < 0;
  });
  if (invalidTileXYZ) {
    return null;
  }
  return { x, y, z };
};

export const getInfo = () => {
  const mbtilesPath = `${MOUNT_PATH}/${DEFAULT_MBTILES_FILENAME}`;
  return new Promise<object>((resolve, reject) => {
    return new MBTiles(mbtilesPath, (error: any, mbtiles: any) => {
      if (error) {
        console.error({ error, mbtilesPath });
        reject(error);
      } else {
        mbtiles.getInfo((error: any, data: object) => {
          if (error) {
            console.error({ error, mbtilesPath });
            reject(error);
          } else {
            resolve(data);
          }
        });
      }
    });
  });
};

export const getTile = (z: string, x: string, y: string) => {
  return new Promise<Buffer>((resolve, reject) => {
    const mbtilesPath = `${MOUNT_PATH}/${DEFAULT_MBTILES_FILENAME}`;
    return new MBTiles(mbtilesPath, (error: any, mbtiles: any) => {
      if (error) {
        console.error({ error, mbtilesPath });
        reject(error);
      } else {
        mbtiles.getTile(z, x, y, (error: any, data: Buffer, headers: any) => {
          if (error) {
            console.error({ error, mbtilesPath });
            reject(error);
          } else {
            resolve(zlib.gunzipSync(data));
          }
        });
      }
    });
  });
};
