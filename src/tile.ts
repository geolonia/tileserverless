import { errorResponse, parseTilePath, getTile } from "./lib";

type Event = { path?: { proxy?: string } };

export const handler = async (event: Event, context: any, callback: any) => {
  // validate path params
  if (!event.path || !event.path.proxy) {
    return callback(errorResponse(400, "invalid Parameters."));
  }

  const match = parseTilePath(event.path.proxy);

  if (!match) {
    return callback(errorResponse(400, "invalid Parameters."));
  }

  const { x, y, z } = match;

  try {
    return callback(null, (await getTile(z, x, y)).toString("base64"));
  } catch (error) {
    // No content
    return callback(null, "");
  }
};
