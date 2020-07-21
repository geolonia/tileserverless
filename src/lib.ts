// @ts-ignore
import MBTiles from "@mapbox/mbtiles";
import zlib from "zlib";

const mbtilesPath = process.env.MOUNT_PATH! + "/tiles.mbtiles";

export const errorResponse = (statusCode: number, message: string) =>
  JSON.stringify({
    statusCode,
    body: { message },
  });

export const getInfo = () => {
  return new Promise<object>((resolve, reject) => {
    return new MBTiles(mbtilesPath, (error: any, mbtiles: any) => {
      console.log({ mbtilesPath });
      if (error) {
        console.error(1, { error, mbtilesPath });
        reject(error);
      } else {
        mbtiles.getInfo((error: any, data: object) => {
          if (error) {
            console.error(2, { error });
            reject(error);
          } else {
            resolve(data);
          }
        });
      }
    });
  });
};

export const getTile = (
  z: number | string,
  x: number | string,
  y: number | string
) => {
  return new Promise<Buffer>((resolve, reject) => {
    return new MBTiles(mbtilesPath, (error: any, mbtiles: any) => {
      console.log({ mbtilesPath });
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
