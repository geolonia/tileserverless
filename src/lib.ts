import * as Sqlite3 from "sqlite3";
import path from "path";
import zlib from "zlib";
// const mbtilesPath = (process.env.MOUNT_PATH as string) + "/data.mbtiles";

export const errorResponse = (statusCode: number, message: string) => ({
  statusCode,
  headers: {
    "Content-Type": "text/plain",
  },
  body: message,
});

const sqlite3 = Sqlite3.verbose();

export const getTile = (z: string, x: string, y: string) => {
  return new Promise<Buffer>((resolve, reject) => {
    const db = new sqlite3.Database(
      path.resolve(__dirname, "..", "data", "poi.mbtiles"),
      sqlite3.OPEN_READONLY
    );

    db.on("error", (error) => {
      reject(error);
    });

    db.serialize(() => {
      db.all(
        `SELECT * FROM tiles WHERE zoom_level=${z} AND tile_column=${x} AND tile_row=${y} LIMIT 1`,
        (error, rows) => {
          if (error) {
            reject(error);
          } else if (rows.length > 0) {
            resolve(rows[0].tile_data);
          } else {
            // empty response
            gzip(Buffer.from("")).then(resolve);
          }
        }
      );
    });
    db.close();
  });
};

export const getMetadata = () => {
  return new Promise<object>((resolve, reject) => {
    const db = new sqlite3.Database(
      path.resolve(__dirname, "..", "data", "poi.mbtiles"),
      sqlite3.OPEN_READONLY
    );

    db.on("error", (error) => {
      reject(error);
    });

    db.serialize(() => {
      db.all(`SELECT * FROM metadata`, (error, rows) => {
        if (error) {
          reject(error);
        } else {
          resolve(
            rows.reduce((prev, row) => {
              prev[row.name] = row.value;
              return prev;
            }, {})
          );
        }
      });
    });
    db.close();
  });
};

export const gzip = (buf: Buffer) => {
  return new Promise<Buffer>((resolve, reject) => {
    zlib.gzip(buf, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
};

export const gunzip = (buf: Buffer) => {
  return new Promise<Buffer>((resolve, reject) => {
    zlib.unzip(buf, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
};
