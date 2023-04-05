import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  getInfo,
  getMbtilesFilename,
  errorResponse,
} from "./lib";
import fs from 'fs/promises';
import path from "path";
const { MOUNT_PATH } = process.env;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const version = event.pathParameters?.ver;
  if (!version) {
    return errorResponse(404, "not found");
  }
  const mbtiles = await getMbtilesFilename(version);
  if (!mbtiles) {
    return errorResponse(404, "not found");
  }
  const [
    meta,
    { mtime },
  ] = await Promise.all([
    getInfo(mbtiles),
    fs.stat(path.join(MOUNT_PATH, mbtiles)),
  ]);
  let formatExt = "";
  if (meta.format) {
    formatExt = "." + meta.format;
  }
  meta.lastModified = mtime.toISOString();

  const domainName = process.env.CLOUDFRONT_DOMAIN_NAME!.split(",")[0];
  const tiles = [
    `https://${domainName}/${version}/tiles/{z}/{x}/{y}${formatExt}?v=${encodeURIComponent(meta.version)}`,
  ];

  let body: { [key: string]: any };
  if (event.routeKey === "GET /{ver}/metadata.json") {
    // metadata.json can be used to introspect a tileset without requiring authorization or
    // triggering a billable page-load.
    body = {
      ...meta,
      tiles: [],
    };
  } else if (event.routeKey === "GET /{ver}/tiles.json") {
    // tiles.json is mainly used for loading and viewing tiles, but some tools use this to
    // introspect and generate base styles, so important keys such as vector_layers are
    // preserved.
    body = {
      ...meta,
      tiles,
    }
  } else {
    throw new Error('routekey was not found')
  }

  return {
    statusCode: 200,
    isBase64Encoded: false,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
      "Last-Modified": mtime.toUTCString(),
    },
    body: JSON.stringify(body),
  };
};
