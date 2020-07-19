import { errorResponse, getTile } from "./lib";

type Event = {
  path?: {
    z?: string;
    x?: string;
    y?: string;
  };
};

export const handler = async (event: Event, context: AWSLambda.Context) => {
  console.log(event);
  // validate path params
  if (!event.path || !event.path.z || !event.path.x || !event.path.y) {
    console.log(1);
    throw errorResponse(400, "invalid Parameters.");
  }

  // proxy tiles.json
  // if (event.pathParameters.proxy === "tiles.json") {
  //   return metadataHandler(event, context, callback);
  // }

  const match = event.path.y.match(/^(?<y>[0-9]+)\.mvt$/);
  if (!match) {
    console.log(2, match);
    throw errorResponse(400, "invalid Parameters.");
  }
  const { x, y, z } = event.path;
  const invalidTileXYZ = [x, y, z].every((val) => {
    const num = parseInt(val, 10);
    return Number.isNaN(num) || num < 0;
  });
  if (invalidTileXYZ) {
    console.log(3);
    throw errorResponse(400, "invalid Parameters.");
  }

  let tile_data: Buffer;
  try {
    tile_data = await getTile(z, x, y);
  } catch (error) {
    console.log(4, error);
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
