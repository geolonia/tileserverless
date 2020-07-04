import AWSLambda from "aws-lambda";
import sqlite3 from "sqlite3";
import zlib from "zlib";
// const mbtilesPath = (process.env.MOUNT_PATH as string) + "/data.mbtiles";
// NOTE: Now Testing
const db = new sqlite3.Database("./data/nps.mbtiles", sqlite3.OPEN_READONLY);

const isBuffer = (data: any): data is Buffer => Buffer.isBuffer(data);
const errorResponse = (statusCode: number, message: string) => ({
  statusCode,
  headers: {
    "Content-Type": "text/plain",
  },
  body: message,
});

export const handler = (
  event: AWSLambda.APIGatewayProxyEvent,
  _1: AWSLambda.Context,
  callback: AWSLambda.Callback
) => {
  db.on("error", (error) => {
    console.error(error);
    callback(null, errorResponse(500, "Internal Server Error."));
  });

  // validate path params
  if (!event.pathParameters) {
    return callback(null, errorResponse(400, "invalid Parameters."));
  }
  const { z: _z, x: _x, y: _y } = event.pathParameters;
  const [z, x, y] = [_z, _x, _y].map((val) => parseInt(val, 10));
  const invalidTileXYZ = [x, y, z].every(
    (val) => Number.isNaN(val) && val > -1
  );
  if (!invalidTileXYZ) {
    return callback(null, {
      statusCode: 400,
      headers: {},
      body: JSON.stringify({ message: "Invalid Path Paramters." }),
    });
  }

  db.serialize(() => {
    db.each(
      `SELECT * FROM tiles WHERE zoom_level=${z} AND tile_column=${x} AND tile_row=${y} LIMIT 1`,
      (error, row) => {
        if (error) {
          console.error(error);
          return callback(null, errorResponse(500, "Internal Server Error."));
        }

        const data = row.tile_data;
        if (!isBuffer(data)) {
          console.error(data);
          return callback(null, errorResponse(500, "Internal Server Error."));
        } else {
          zlib.gzip(data, (error, result) => {
            if (error) {
              console.error(error);
              return callback(
                null,
                errorResponse(500, "Internal Server Error.")
              );
            } else {
              return callback(null, {
                statusCode: 200,
                headers: {
                  "Content-Type": "application/vnd.mapbox-vector-tile",
                  "Access-Control-Allow-Origin": "*",
                  "Access-Control-Allow-Methods": "GET, HEAD",
                  "Access-Control-Allow-Headers": "Content-Type",
                  "Content-Encoding": "gzip",
                  "X-Frame-Options": "SAMEORIGIN",
                },
                body: result,
              });
            }
          });
        }
      }
    );
  });
  db.close();
};
