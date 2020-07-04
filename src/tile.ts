import AWSLambda from "aws-lambda";
import { errorResponse, getTile, gzip } from "./lib";

export const handler = (
  event: AWSLambda.APIGatewayProxyEvent,
  _1: AWSLambda.Context,
  callback: AWSLambda.Callback
) => {
  // validate path params
  if (!event.pathParameters) {
    return callback(null, errorResponse(400, "invalid Parameters."));
  }
  const { z, x, y } = event.pathParameters;
  const invalidTileXYZ = [x, y, z].every((val) => {
    const num = parseInt(val, 10);
    return Number.isNaN(num) || num < 0;
  });
  if (invalidTileXYZ) {
    return callback(null, errorResponse(400, "invalid Parameters."));
  }

  // SQL Injection Free
  getTile(z, x, y)
    .then(gzip)
    .then((data) => {
      // NOTE: 空の Buffer を Gzip すると20バイトほどのデータになるので条件分岐の意味がない。
      // 空の Buffer を返すときに Gzip されている方がいいのか、検討する
      if (data.length > 0) {
        callback(null, {
          statusCode: 200,
          headers: {
            "Content-Type": "application/vnd.mapbox-vector-tile",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD",
            "Access-Control-Allow-Headers": "Content-Type",
            "Content-Encoding": "gzip",
            "X-Frame-Options": "SAMEORIGIN",
          },
          body: data,
        });
      } else {
        // TODO: 多分 200 として空の結果を返すように統合する
        callback(null, errorResponse(404, "not Found"));
      }
    })
    .catch(() => {
      callback(null, errorResponse(500, "Internal Server Error."));
    });
};
