// Checks a deployed tileserverless HTTP API.
//
//   node scripts/check-deployment.js <base URL> [tileset]
//
// Without a tileset, requests a tileset that does not exist on all three
// routes and expects the handlers' own 404 response. That proves the route
// reaches the right function, the function starts (including loading sqlite3)
// and EFS is mounted (a mount failure is a 5xx from the Lambda service).
//
// With a tileset (the {ver} part of the URL), also expects 200 from
// tiles.json and metadata.json, and a tile URL in tiles.json.
//
// A first request after a deployment can hit a cold start with a VPC and EFS
// mount, so 5xx responses and network errors are retried a few times.

const [baseUrl, tileset] = process.argv.slice(2);
if (!baseUrl) {
  console.error("usage: node scripts/check-deployment.js <base URL> [tileset]");
  process.exit(2);
}

const MISSING = "__tileserverless-check-missing__";
const ATTEMPTS = 5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const get = async (path) => {
  const url = new URL(path, baseUrl.replace(/\/?$/, "/")).toString();
  let lastError;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const resp = await fetch(url);
      if (resp.status < 500) {
        return { url, status: resp.status, body: await resp.text() };
      }
      lastError = new Error(`${url}: ${resp.status} ${await resp.text()}`);
    } catch (err) {
      lastError = err;
    }
    await sleep(2000 * attempt);
  }
  throw lastError;
};

const expectHandlerNotFound = async (path) => {
  const { url, status, body } = await get(path);
  // The handlers return {"status":404,...}; API Gateway's own 404 for an
  // unknown route is {"message":"Not Found"}.
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    json = undefined;
  }
  if (status !== 404 || !json || json.status !== 404) {
    throw new Error(`${url}: expected the handler's 404, got ${status} ${body}`);
  }
  console.log(`ok  ${status} ${url}`);
};

const expectJson = async (path) => {
  const { url, status, body } = await get(path);
  if (status !== 200) {
    throw new Error(`${url}: expected 200, got ${status} ${body}`);
  }
  console.log(`ok  ${status} ${url}`);
  return JSON.parse(body);
};

(async () => {
  await expectHandlerNotFound(`${MISSING}/tiles.json`);
  await expectHandlerNotFound(`${MISSING}/metadata.json`);
  await expectHandlerNotFound(`${MISSING}/tiles/0/0/0`);

  if (tileset) {
    const tilesJson = await expectJson(`${encodeURIComponent(tileset)}/tiles.json`);
    if (!Array.isArray(tilesJson.tiles) || tilesJson.tiles.length === 0) {
      throw new Error("tiles.json: no tile URL");
    }
    await expectJson(`${encodeURIComponent(tileset)}/metadata.json`);
  }

  console.log("Deployment check passed");
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
