import MBTiles, { Info as MBTilesInfo } from "@mapbox/mbtiles";
import { promises as dns } from "dns";
import fs from "fs";
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
    if (e.code === "ENOTFOUND") {
      const value = `custom/${version}.mbtiles`;
      if (!fs.existsSync(`${MOUNT_PATH}/${value}`)) {
        return null;
      }
      VERSION_CACHE[version] = {
        expires: (new Date().getTime()) + 300_000, // 5 minutes
        value,
      };
      return value;
    }
    return null;
  }
  return null;
};

// latest recently-used mbtiles filenames will be at the end of the list.
const MBTILES_LRU_INDEX: string[] = []
const MBTILES_CACHE: { [key: string]: MBTiles } = {}
const MBTILES_CACHE_MAX = 6;

const getMBTilesInstance = (filename: string) => {
  const mbtilesUrl = `${MOUNT_PATH}/${filename}?mode=ro`
  return new Promise<MBTiles>((resolve, reject) => {
    if (filename in MBTILES_CACHE) {
      const prevIdx = MBTILES_LRU_INDEX.indexOf(filename);
      if (prevIdx !== -1) {
        MBTILES_LRU_INDEX.splice(prevIdx, 1);
      }
      MBTILES_LRU_INDEX.push(filename);
      return resolve(MBTILES_CACHE[filename]);
    }

    if (MBTILES_LRU_INDEX.length >= MBTILES_CACHE_MAX) {
      const idxToDelete = MBTILES_LRU_INDEX.length - MBTILES_CACHE_MAX;
      const filenamesToDelete = MBTILES_LRU_INDEX.splice(0, idxToDelete);
      for (const toDel in filenamesToDelete) {
        delete MBTILES_CACHE[toDel];
      }
    }

    new MBTiles(mbtilesUrl, (err, mbtiles) => {
      if (err || !mbtiles) {
        return reject(err)
      }
      MBTILES_LRU_INDEX.push(filename);
      MBTILES_CACHE[filename] = mbtiles;
      return resolve(mbtiles);
    })
  })
}

export const getInfo = async (filename: string) => {
  const mbtiles = await getMBTilesInstance(filename);
  const info = await new Promise<MBTilesInfo>((resolve, reject) => {
    mbtiles.getInfo((error, data) => {
      if (error || !data) {
        return reject(error);
      }
      resolve(data);
    });
  });
  return info;
};

export interface GetTileResponse {
  data: Buffer
  headers: { [key: string]: string }
}

export const getTile = async (filename: string, z: string, x: string, y: string) => {
  const mbtiles = await getMBTilesInstance(filename);
  const _z = parseInt(z, 10);
  const _x = parseInt(x, 10);
  const _y = parseInt(y, 10);
  const resp = await new Promise<GetTileResponse>((resolve, reject) => {
    mbtiles.getTile(_z, _x, _y, (error, data, headers) => {
      if (error || !data || !headers) {
        return reject(error);
      }
      resolve({ data, headers });
    });
  });
  return resp;
};
