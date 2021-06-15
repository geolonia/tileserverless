import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  getInfo,
  getMbtilesFilename,
  errorResponse,
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
  const meta = await getInfo(mbtiles);
  let formatExt = "";
  if (meta.format) {
    formatExt = "." + meta.format;
  }
  const domainName = process.env.CLOUDFRONT_DOMAIN_NAME!.split(",")[0];
  const tiles = [
    `https://${domainName}/${version}/tiles/{z}/{x}/{y}${formatExt}?v=${encodeURIComponent(meta.version)}`,
  ];

  let body: { [key: string]: any };
  if (event.routeKey === "GET /{ver}/metadata.json") {
    body = {
      ...meta,
      tiles,
    }
  } else if (event.routeKey === "GET /{ver}/tiles.json") {
    body = {
      attribution: meta.attribution,
      bounds: meta.bounds,
      description: meta.description,
      format: meta.format,
      scheme: meta.scheme,
      version: meta.version,
      maxzoom: meta.maxzoom,
      minzoom: meta.minzoom,
      center: meta.center,
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
    },
    body: JSON.stringify(body),
  };
};
