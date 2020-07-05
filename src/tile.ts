import { errorResponse, getTile, gzip, gunzip } from "./lib";

export const handler = (
  event: AWSLambda.APIGatewayProxyEvent,
  _1: AWSLambda.Context,
  callback: AWSLambda.Callback
) => {
  // validate path params
  if (!event.pathParameters) {
    return callback(null, errorResponse(400, "invalid Parameters."));
  }
  const { z, x, y } = event.pathParameters;
  const invalidTileXYZ = [x, y, z].every((val) => {
    const num = parseInt(val, 10);
    return Number.isNaN(num) || num < 0;
  });
  if (invalidTileXYZ) {
    return callback(null, errorResponse(400, "invalid Parameters."));
  }

  // SQL Injection Free
  getTile(z, x, y)
    .then(gunzip)
    .then((data) => {
      return callback(null, {
        statusCode: 200,
        headers: {
          "Content-Type": "application/vnd.mapbox-vector-tile; charset=UTF-8",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD",
          "Access-Control-Allow-Headers": "Content-Type",
          // "Content-Encoding": "gzip",
          "X-Frame-Options": "SAMEORIGIN",
        },
        body: data.toString("utf-8"),
      });
    })
    .catch(() => {
      return callback(null, errorResponse(500, "Internal Server Error."));
    });
};
