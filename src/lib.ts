// @ts-ignore
import MBTiles from "@mapbox/mbtiles";
import { promises as dns } from "dns";
import { APIGatewayProxyEventPathParameters } from "aws-lambda";
const { MOUNT_PATH, TILES_VERSION_DNS_NAME } = process.env;

interface VersionCacheEntry {
  expires: number
  value: string
}

const VERSION_CACHE: { [key: string]: VersionCacheEntry } = {}

export const errorResponse = (status: number, message: string) => ({
  statusCode: status,
  isBase64Encoded: false,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    status,
    message: status === 204 ? "" : message,
  })
});

export const parseTilePath = (params?: APIGatewayProxyEventPathParameters) => {
  if (!params) return null;

  const { x, y, z } = params;
  const invalidTileXYZ = [x, y, z].every((val) => {
    if (!val) return false;
    const num = parseInt(val, 10);
    return Number.isNaN(num) || num < 0;
  });
  if (invalidTileXYZ) {
    return null;
  }
  // At this point, we know that all x, y, and z exist.
  return { x, y, z } as { x: string, y: string, z: string };
};

export const getMbtilesFilename = async (version: string) => {
  const now = new Date().getTime();
  const cachedEntry = VERSION_CACHE[version];
  if (cachedEntry && cachedEntry.expires >= now) {
    return cachedEntry.value;
  }

  const match = version.match(/^[a-zA-Z0-9-]+$/);
  if (!match) {
    return null;
  }

  try {
    const records = await dns.resolveTxt(`${version}-tiles.${TILES_VERSION_DNS_NAME}`);
    const joined = records.map(r => r.join(''));
    for (let i = 0; i < joined.length; i++) {
      const element = joined[i];
      const match = element.match(/^tsls-file-name=([a-zA-Z0-9-_]+.mbtiles)$/);
      if (!match) {
        continue;
      }
      VERSION_CACHE[version] = {
        expires: (new Date().getTime()) + 300_000, // 5 minutes
        value: match[1],
      }
      return match[1];
    }
  } catch (e) {
    return null;
  }
  return null;
};

export const getInfo = (filename: string) => {
  const mbtilesPath = `${MOUNT_PATH}/${filename}`;
  return new Promise<object>((resolve, reject) => {
    return new MBTiles(mbtilesPath, (error: any, mbtiles: any) => {
      if (error) {
        console.error({ error, mbtilesPath });
        reject(error);
        return;
      }
      mbtiles.getInfo((error: any, data: object) => {
        if (error) {
          console.error({ error, mbtilesPath });
          reject(error);
          return;
        }
        resolve(data);
      });
    });
  });
};

export interface GetTileResponse {
  data: Buffer
  headers: { [key: string]: string }
}

export const getTile = (filename: string, z: string, x: string, y: string) => {
  return new Promise<GetTileResponse>((resolve, reject) => {
    const mbtilesPath = `${MOUNT_PATH}/${filename}`;
    return new MBTiles(mbtilesPath, (error: any, mbtiles: any) => {
      if (error) {
        console.error({ error, mbtilesPath });
        reject(error);
        return;
      }
      mbtiles.getTile(z, x, y, (error: any, data: Buffer, headers: { [key: string]: string }) => {
        if (error) {
          console.error({ error, mbtilesPath });
          reject(error);
          return;
        }
        resolve({ data, headers });
      });
    });
  });
};
