import zlib from "zlib";
// const mbtilesPath = (process.env.MOUNT_PATH as string) + "/data.mbtiles";

export const errorResponse = (statusCode: number, message: string) => ({
  statusCode,
  headers: {
    "Content-Type": "text/plain",
  },
  body: message,
});

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
