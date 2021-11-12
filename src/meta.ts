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
      name: meta.name,
      description: meta.description,
      version: meta.version,
      minzoom: meta.minzoom,
      maxzoom: meta.maxzoom,
      center: meta.center,
      bounds: meta.bounds,
      type: meta.type,
      format: meta.format,
      json: {
        vector_layers: JSON.stringify(meta.vector_layers)
      }
    };
  } else if (event.routeKey === "GET /{ver}/tiles.json") {
    /**
     * Definition of TileJSON v3.0.0
     * see https://github.com/mapbox/tilejson-spec/blob/master/3.0.0/schema.json
     */
    body = {
      tilejson: "3.0.0",
      name: meta.name,
      description: meta.description,
      version: meta.version,
      attribution: meta.attribution,
      scheme: meta.scheme,
      format: meta.format,
      minzoom: meta.minzoom,
      maxzoom: meta.maxzoom,
      bounds: meta.bounds,
      center: meta.center,
      vector_layers: meta.vector_layers,
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
    },
    body: JSON.stringify(body),
  };
};
