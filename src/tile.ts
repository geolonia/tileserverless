// NOTE: これは Lambda-proxy のハンドラ

import { errorResponse, getTile } from "./lib";

// @ts-ignore
import MBTiles from "@mapbox/mbtiles";
import path from "path";

export const handler = async (
  event: { path?: { proxy?: string } },
  context: AWSLambda.Context
) => {
  // validate path params
  if (!event.path || !event.path.proxy) {
    throw errorResponse(400, "invalid Parameters.");
  }

  const match = event.path.proxy.match(
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

  try {
    return (await getTile(z, x, y)).toString("base64");
  } catch (error) {
    return Buffer.from(
      JSON.stringify({ statusCode: 204, message: "no content" })
    ).toString("base64");
  }
};
