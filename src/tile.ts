import { errorResponse, getTile } from "./lib";

type Event = {
  path: {
    xyz: string;
  };
};

export const handler = async (event: any, context: AWSLambda.Context) => {
  console.log(event)
  // validate path params
  if (!event.path || !event.path.xyz) {
    throw errorResponse(400, "invalid Parameters.");
  }

  // proxy tiles.json
  // if (event.pathParameters.proxy === "tiles.json") {
  //   return metadataHandler(event, context, callback);
  // }

  const match = event.path.xyz.match(
    /^(?<z>[0-9]+)\/(?<x>[0-9]+)\/(?<y>[0-9]+)\.mvt$/
  );
  if (!match) {
    throw errorResponse(400, "invalid Parameters.");
  }
  const { x, y, z } = match.groups as { x: string; y: string; z: string };
  const invalidTileXYZ = [x, y, z].every((val) => {
    const num = parseInt(val, 10);
    return Number.isNaN(num) || num < 0;
  });
  if (invalidTileXYZ) {
    throw errorResponse(400, "invalid Parameters.");
  }

  let tile_data: Buffer;
  try {
    tile_data = await getTile(z, x, y);
  } catch (error) {
    return JSON.stringify({ statusCode: 204, body: { message: "no content" } });
  }

  return tile_data.toString("utf-8");
};

// headers: {
//   "Content-Type": "application/vnd.mapbox-vector-tile",
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Methods": "GET, HEAD",
//   "Access-Control-Allow-Headers": "Content-Type",
//   // "Content-Encoding": "", // API Gateway should encode the body following Accept-Encoding header
//   "X-Frame-Options": "SAMEORIGIN",
// },
