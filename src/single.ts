import fs from "fs";
import path from "path";

export const handler = async () => {
  return fs.readFileSync(path.resolve(__dirname, "../data/0.mvt"), {
    encoding: "base64",
  });
};
