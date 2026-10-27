import fs from "fs";
import os from "os";
import path from "path";

// MOUNT_PATH is read when src/lib.ts is loaded, so it has to be set before
// any test file imports the handlers. Each test file gets its own directory.
// `mnt` is the mount point; its parent is used to check path traversal.
const root = fs.mkdtempSync(path.join(os.tmpdir(), "tileserverless-test-"));
const mountPath = path.join(root, "mnt");
fs.mkdirSync(mountPath);

// MOUNT_PATH is declared read-only in src/global.d.ts.
Object.assign(process.env, { MOUNT_PATH: mountPath });
process.env.CLOUDFRONT_DOMAIN_NAME = "tiles.example.com,tiles-alt.example.com";

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});
