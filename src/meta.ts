import { getInfo } from "./lib";

export const handler = async (event: any, context: any, callback: any) => {
  const tiles = [
    `https://${event.requestContext.domainName}/${event.requestContext.stage}/tiles/{z}/{x}/{y}.mvt`,
  ];
  const meta = await getInfo();

  return callback(null, {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ ...meta, tiles }),
  });
};
