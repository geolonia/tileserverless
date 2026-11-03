// Smoke test for the Lambda package built by the Makefile.
//
// Runs inside the AWS Lambda Node.js base image with the package mounted at
// /var/task, to check that the sqlite3 native binary loads on the Lambda OS
// and that the handlers serve a tile and tiles.json from an .mbtiles file.
//
//   node scripts/smoke-test-package.js [package dir, default /var/task]
const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");

const taskDir = path.resolve(process.argv[2] || "/var/task");
const mountPath = fs.mkdtempSync(path.join(os.tmpdir(), "mnt-"));
process.env.MOUNT_PATH = mountPath;
process.env.CLOUDFRONT_DOMAIN_NAME = "tiles.example.com";

const MBTiles = require(path.join(taskDir, "node_modules/@mapbox/mbtiles"));
const tile = require(path.join(taskDir, "dist/tile.js"));
const meta = require(path.join(taskDir, "dist/meta.js"));

const call = (fn, ...args) =>
  new Promise((resolve, reject) => fn(...args, (err, value) => (err ? reject(err) : resolve(value))));

const createFixture = async () => {
  const mbtiles = await new Promise((resolve, reject) => {
    new MBTiles(path.join(mountPath, "smoke.mbtiles") + "?mode=rwc", (err, m) => (err ? reject(err) : resolve(m)));
  });
  await call(mbtiles.startWriting.bind(mbtiles));
  await call(mbtiles.putInfo.bind(mbtiles), { name: "smoke", format: "pbf" });
  await call(mbtiles.putTile.bind(mbtiles), 0, 0, 0, zlib.gzipSync(Buffer.from("tile")));
  await call(mbtiles.stopWriting.bind(mbtiles));
  await call(mbtiles.close.bind(mbtiles));
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  await createFixture();

  const tileResp = await tile.handler(
    { routeKey: "GET /{ver}/tiles/{z}/{x}/{y}", pathParameters: { ver: "smoke", z: "0", x: "0", y: "0.pbf" } },
    {},
    () => undefined,
  );
  assert(tileResp.statusCode === 200, `tile: expected 200, got ${tileResp.statusCode}`);

  const metaResp = await meta.handler(
    { routeKey: "GET /{ver}/tiles.json", pathParameters: { ver: "smoke" } },
    {},
    () => undefined,
  );
  assert(metaResp.statusCode === 200, `tiles.json: expected 200, got ${metaResp.statusCode}`);
  assert(JSON.parse(metaResp.body).name === "smoke", "tiles.json: unexpected body");

  console.log(`Smoke test passed on Node.js ${process.version} (${os.platform()}-${os.arch()})`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
