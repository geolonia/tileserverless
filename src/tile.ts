// NOTE: これは Lambda-proxy のハンドラ

import { errorResponse } from "./lib";

// @ts-ignore
import MBTiles from "@mapbox/mbtiles";
import path from "path";

export const handler = (
  event: { pathParameters?: { proxy?: string } },
  context: AWSLambda.Context,
  callback: AWSLambda.Callback
) => {
  console.log(event);
  // validate path params
  if (!event.pathParameters || !event.pathParameters.proxy) {
    console.log(1);
    return callback(null, errorResponse(400, "invalid Parameters."));
  }

  const match = event.pathParameters.proxy.match(
    /^(?<z>[0-9]+)\/(?<x>[0-9]+)\/(?<y>[0-9]+)\.mvt$/
  );
  if (!match) {
    console.log(2, match);
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

  return new MBTiles(
    path.resolve(__dirname, "..", "data", "nps.mbtiles"),
    (error: any, mbtiles: any) => {
      if (error) {
        console.error(error);
        return callback(null, errorResponse(500, "Unknown error"));
      } else {
        mbtiles.getTile(z, x, y, (error: any, data: any, headers: any) => {
          if (error) {
            return callback(null, errorResponse(204, "Not found"));
          } else {
            return callback(null, {
              statusCode: 200,
              headers: {
                "Content-Type": "application/vnd.mapbox-vector-tile",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD",
                "Access-Control-Allow-Headers": "Content-Type",
                "X-Frame-Options": "SAMEORIGIN",
              },
              body: data.toString("base64"),
            });
          }
        });
      }
    }
  );
};
