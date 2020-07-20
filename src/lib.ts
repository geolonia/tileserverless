// @ts-ignore
import MBTiles from "@mapbox/mbtiles";
import zlib from "zlib";

const mbtilesPath = process.env.MOUNT_PATH! + "/tiles.mbtiles";

export const errorResponse = (statusCode: number, message: string) =>
  JSON.stringify({
    statusCode,
    body: { message },
  });

export const getTile = (
  z: number | string,
  x: number | string,
  y: number | string
) => {
  return new Promise<Buffer>((resolve, reject) => {
    return new MBTiles(mbtilesPath, (error: any, mbtiles: any) => {
      if (error) {
        reject(error);
      } else {
        mbtiles.getTile(z, x, y, (error: any, data: Buffer, headers: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(zlib.gunzipSync(data));
          }
        });
      }
    });
  });
};
