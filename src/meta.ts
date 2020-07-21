import { getInfo } from "./lib";

export const handler = async (event: any, context: any, callback: any) => {
  console.log(event);
  const meta = await getInfo();
  console.log(meta);

  return callback(null, {
    statusCode: 200,
    headers: "",
    body: JSON.stringify(meta),
  });
};
