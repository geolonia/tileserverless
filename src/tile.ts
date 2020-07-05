import { errorResponse, getTile, gzip, gunzip } from "./lib";
import { handler as metadataHandler } from "./metadata";

export const handler = (
  event: AWSLambda.APIGatewayProxyEvent,
  context: AWSLambda.Context,
  callback: AWSLambda.Callback
) => {
  // validate path params
  if (!event.pathParameters || !event.pathParameters.proxy) {
    return callback(null, errorResponse(400, "invalid Parameters."));
  }
  // get tiles.json
  if (event.pathParameters.proxy === "tiles.json") {
    return metadataHandler(event, context, callback);
  }

  const match = event.pathParameters.proxy.match(
    /^(?<z>[0-9]+)\/(?<x>[0-9]+)\/(?<y>[0-9]+)\.mvt$/
  );
  if (!match) {
    return callback(null, errorResponse(400, "invalid Parameters."));
  }
  const { x, y, z } = match.groups as { x: string; y: string; z: string };

  const invalidTileXYZ = [x, y, z].every((val) => {
    const num = parseInt(val, 10);
    return Number.isNaN(num) || num < 0;
  });
  if (invalidTileXYZ) {
    return callback(null, errorResponse(400, "invalid Parameters."));
  }

  // SQL Injection Free
  getTile(z, x, y)
    // .then(gunzip)
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
    .catch((error) => {
      console.error(error);
      return callback(null, errorResponse(500, "Internal Server Error."));
    });
};
