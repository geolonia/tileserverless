import { errorResponse, getMetadata } from "./lib";

export const handler = (
  event: AWSLambda.APIGatewayProxyEvent,
  _1: AWSLambda.Context,
  callback: AWSLambda.Callback
) => {
  const { domainName, stage } = event.requestContext;
  getMetadata()
    .then((metadata) => {
      return callback(null, {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD",
          "Access-Control-Allow-Headers": "Content-Type",
          "X-Frame-Options": "SAMEORIGIN",
        },
        body: JSON.stringify({
          ...metadata,
          tiles: [`https://${domainName}/${stage}/{z}/{x}/{y}.mvt`],
        }),
      });
    })
    .catch((error) => {
      console.error(error);
      return callback(null, errorResponse(500, "Internal Server Error."));
    });
};
