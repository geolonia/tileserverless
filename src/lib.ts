import MBTiles, { Info as MBTilesInfo } from "@mapbox/mbtiles";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { APIGatewayProxyEventPathParameters } from "aws-lambda";
const { MOUNT_PATH } = process.env;

export const errorResponse = (status: number, message: string) => ({
  statusCode: status,
  isBase64Encoded: false,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store, max-age=0",
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
  const rawPath = version.replace(/\$/g, '/');
  const safePath = path.resolve(
    MOUNT_PATH,
    '.' + path.normalize('/' + rawPath)
  ) + '.mbtiles';
  if (fs.existsSync(safePath)) {
    return path.relative(MOUNT_PATH, safePath);
  }
  return null;
};

// latest recently-used mbtiles filenames will be at the end of the list.
const MBTILES_LRU_INDEX: string[] = []
const MBTILES_CACHE: { [key: string]: MBTiles } = {}
const MBTILES_CACHE_MAX = 6;

const getMBTilesInstance = (filename: string) => {
  return new Promise<MBTiles>((resolve, reject) => {
    const mbtilesUrl = `${MOUNT_PATH}/${filename}?mode=ro`;
    const localFilePath = path.join(MOUNT_PATH, filename);
    let cacheKey = filename;
    try {
      const _stat = fs.statSync(localFilePath);
      cacheKey = _stat.size + '-' + Number(_stat.mtime) + '-' + filename;
    } catch (e) {
      if (e.code === "ENOENT") {
        return reject(e);
      }
    }
    if (cacheKey in MBTILES_CACHE) {
      const prevIdx = MBTILES_LRU_INDEX.indexOf(cacheKey);
      if (prevIdx !== -1) {
        MBTILES_LRU_INDEX.splice(prevIdx, 1);
      }
      MBTILES_LRU_INDEX.push(cacheKey);
      return resolve(MBTILES_CACHE[cacheKey]);
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
        return reject(err);
      }
      MBTILES_LRU_INDEX.push(cacheKey);
      MBTILES_CACHE[cacheKey] = mbtiles;
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
      // If version already has build information, we don't need to add it.
      if (data.version && (data.version as string).indexOf("+") > 0) {
        return resolve(data);
      }

      const fingerprintStr = mbtiles._stat.size + '-' + Number(mbtiles._stat.mtime);
      const hash = crypto.createHash('md5');
      hash.update(fingerprintStr);
      const fingerprint = hash.digest('hex');
      if (!data.version) {
        data.version = `1.0.0+${fingerprint}`;
      } else {
        data.version += `+${fingerprint}`;
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
