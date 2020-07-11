import { errorResponse, isGzipped } from "./lib";
import zlib from "zlib";

// @ts-ignore
import MBTiles from "@mapbox/mbtiles";
import path from "path";

export const handler = (
  event: AWSLambda.APIGatewayProxyEvent,
  context: AWSLambda.Context,
  callback: AWSLambda.Callback
) => {
  console.log(event, 1);
  // validate path params
  if (!event.pathParameters || !event.pathParameters.proxy) {
    return callback(null, errorResponse(400, "invalid Parameters."));
  }
  // proxy tiles.json
  // if (event.pathParameters.proxy === "tiles.json") {
  //   return metadataHandler(event, context, callback);
  // }
  const match = event.pathParameters.proxy.match(
    /^(?<z>[0-9]+)\/(?<x>[0-9]+)\/(?<y>[0-9]+)\.mvt$/
  );
  console.log(2);
  if (!match) {
    return callback(null, errorResponse(400, "invalid Parameters."));
  }
  const { x, y, z } = match.groups as { x: string; y: string; z: string };
  console.log(3);
  const invalidTileXYZ = [x, y, z].every((val) => {
    const num = parseInt(val, 10);
    return Number.isNaN(num) || num < 0;
  });
  if (invalidTileXYZ) {
    return callback(null, errorResponse(400, "invalid Parameters."));
  }
  console.log(4);
  return new MBTiles(
    path.resolve(__dirname, "..", "data", "nps.mbtiles"),
    (error: any, mbtiles: any) => {
      console.log(5);
      if (error) {
        console.error(error);
        return callback(null, errorResponse(500, "Internal Server Error."));
      } else {
        mbtiles.getTile(z, x, y, (error: any, data: any, headers: any) => {
          if (error) {
            console.error(error);
            return callback(null, errorResponse(204, "Not found"));
          } else {
            return callback(null, {
              statusCode: 200,
              headers: {
                "Content-Type": "application/x-protobuf",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD",
                "Access-Control-Allow-Headers": "Content-Type",
                "Content-Encoding": "identity",
                "X-Frame-Options": "SAMEORIGIN",
              },
              body: data,
            });
          }
        });
      }
    }
  );
};
