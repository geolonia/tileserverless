import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  errorResponse,
  parseTilePath,
  getTile,
  getMbtilesFilename,
} from "./lib";

const DEFAULT_HEADERS = {
  "Cache-Control": "public, max-age=604800, immutable",
  "Access-Control-Allow-Origin": "*",
  "X-Frame-Options": "SAMEORIGIN",
  "Access-Control-Allow-Methods": "GET, HEAD",
  "Access-Control-Allow-Headers": "Content-Type",
}

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
    const { data, headers } = await getTile(mbtiles, z, x, y);
    return {
      headers: {
        ...headers,
        ...DEFAULT_HEADERS,
      },
      isBase64Encoded: true,
      statusCode: 200,
      body: data.toString("base64"),
    };
  } catch (error) {
    // No content
    return {
      headers: DEFAULT_HEADERS,
      statusCode: 204,
      body: "",
    }
  }
};
