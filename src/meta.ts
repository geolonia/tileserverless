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
    `https://${domainName}/${version}/tiles/{z}/{x}/{y}${formatExt}`,
  ];

  return {
    statusCode: 200,
    isBase64Encoded: false,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...meta, tiles }),
  };
};
