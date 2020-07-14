import zlib from "zlib";
// @ts-ignore
import MBTiles from "@mapbox/mbtiles";
import path from "path";

// const mbtilesPath = (process.env.MOUNT_PATH as string) + "/data.mbtiles";

export const errorResponse = (statusCode: number, message: string) => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "text/plain",
  },
  body: message,
});

export const getTile = (
  z: number | string,
  x: number | string,
  y: number | string
) => {
  return new Promise<Buffer>((resolve, reject) => {
    return new MBTiles(
      path.resolve(__dirname, "..", "data", "nps.mbtiles"),
      (error: any, mbtiles: any) => {
        if (error) {
          reject(error);
        } else {
          mbtiles.getTile(z, x, y, (error: any, data: any, headers: any) => {
            if (error) {
              reject(error);
            } else {
              resolve(data);
            }
          });
        }
      }
    );
  });
};

export const isGzipped = (buf: Buffer) => {
  return buf.slice(0, 2).indexOf(Buffer.from([0x1f, 0x8b])) === 0;
};

export const gunzip = (buf: Buffer) => {
  return new Promise<Buffer>((resolve, reject) => {
    zlib.unzip(buf, (error, data) => {
      if (error) {
        console.error(error);
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
};
