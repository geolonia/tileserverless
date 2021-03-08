import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  errorResponse,
  parseTilePath,
  getTile,
  getMbtilesFilename,
} from "./lib";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const version = event.pathParameters?.ver;
  if (!version) {
    return errorResponse(404, "not found");
  }
  const mbtiles = await getMbtilesFilename(version);
  if (!mbtiles) {
    return errorResponse(404, "not found");
  }

  const match = parseTilePath(event.pathParameters);

  if (!match) {
    return errorResponse(400, "invalid Parameters.");
  }

  const { x, y: origY, z } = match;
  const [y, ] = origY.split(".");

  try {
    const tile = await getTile(mbtiles, z, x, y);
    return {
      headers: {
        "Content-Type": "application/vnd.mapbox-vector-tile",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "X-Frame-Options": "SAMEORIGIN",
        "Access-Control-Allow-Methods": "GET, HEAD",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      isBase64Encoded: true,
      statusCode: 200,
      body: tile.toString("base64"),
    };
  } catch (error) {
    // No content
    return errorResponse(204, "");
  }
};
