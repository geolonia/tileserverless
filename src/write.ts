import * as Lambda from "aws-lambda";
import fs from "fs";
const MOUNT_PATH = process.env.MOUNT_PATH as string;

export const handler = async (
  event: any,
  _1: Lambda.Context,
  callback: Lambda.Callback
) => {
  const { name } = event;
  await fs.promises.writeFile(`${MOUNT_PATH}/hello`, `Hello, ${name}!`);
  return callback(null, { success: true });
};
