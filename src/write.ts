import * as Lambda from "aws-lambda";
import fs from "fs";
const MOUNT_PATH = process.env.MOUNT_PATH as string;

export const handler = async (
  event: any,
  _1: Lambda.Context,
  callback: Lambda.Callback
) => {
  const { name } = event;
  if (!name) {
    throw new Error("no name specified.");
  }
  await fs.promises.writeFile(`${MOUNT_PATH}/name`, name);
  return callback(null, { success: true });
};
