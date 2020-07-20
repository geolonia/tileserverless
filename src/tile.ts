import { errorResponse, getTile } from "./lib";

export const handler = async (event: { path?: { proxy?: string } }) => {
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
    console.log(error)
    return JSON.stringify({ statusCode: 204, message: "no content" })
  }
};
