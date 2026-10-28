// Compares the responses of two tileserverless HTTP APIs, e.g. the Serverless
// Framework stack and the SAM stack before CloudFront is switched.
//
//   node scripts/compare-endpoints.js <old base URL> <new base URL> <path>...
//
// Example:
//   node scripts/compare-endpoints.js \
//     https://<old>.execute-api.ap-northeast-1.amazonaws.com \
//     https://<new>.execute-api.ap-northeast-1.amazonaws.com \
//     /<tileset>/tiles.json /<tileset>/metadata.json /<tileset>/tiles/0/0/0.pbf
//
// Compares the status, the headers the handlers set, and the body. Exits with
// 1 if any path differs.

const [oldBase, newBase, ...paths] = process.argv.slice(2);
if (!oldBase || !newBase || paths.length === 0) {
  console.error("usage: node scripts/compare-endpoints.js <old base URL> <new base URL> <path>...");
  process.exit(2);
}

const HEADERS = [
  "content-type",
  "content-encoding",
  "cache-control",
  "access-control-allow-origin",
  "access-control-allow-methods",
  "access-control-allow-headers",
  "x-frame-options",
  "last-modified",
  "etag",
];

const fetchPath = async (base, path) => {
  const url = new URL(path.replace(/^\//, ""), base.replace(/\/?$/, "/")).toString();
  const resp = await fetch(url);
  const headers = Object.fromEntries(HEADERS.map((h) => [h, resp.headers.get(h)]));
  const body = Buffer.from(await resp.arrayBuffer());
  return { url, status: resp.status, headers, body };
};

const describeBody = (body) => `${body.length} bytes`;

(async () => {
  let differences = 0;
  for (const path of paths) {
    const [a, b] = await Promise.all([fetchPath(oldBase, path), fetchPath(newBase, path)]);
    const problems = [];
    if (a.status !== b.status) problems.push(`status ${a.status} != ${b.status}`);
    for (const h of HEADERS) {
      if (a.headers[h] !== b.headers[h]) problems.push(`${h}: ${a.headers[h]} != ${b.headers[h]}`);
    }
    if (!a.body.equals(b.body)) {
      problems.push(`body differs (${describeBody(a.body)} vs ${describeBody(b.body)})`);
    }
    if (problems.length === 0) {
      console.log(`same  ${a.status} ${path}`);
    } else {
      differences++;
      console.log(`DIFF  ${path}`);
      for (const p of problems) console.log(`      ${p}`);
    }
  }
  if (differences > 0) {
    console.error(`${differences} of ${paths.length} paths differ`);
    process.exit(1);
  }
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
