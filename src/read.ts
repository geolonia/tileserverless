import * as Lambda from "aws-lambda";
import fs from "fs";
const MOUNT_PATH = process.env.MOUNT_PATH as string;

export const handler = async (
  _0: any,
  _1: Lambda.Context,
  callback: Lambda.Callback
) => {
  const data = await fs.promises.readFile(`${MOUNT_PATH}/name`, "utf-8");
  return callback(null, data);
};
