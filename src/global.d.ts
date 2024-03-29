declare namespace NodeJS {
  interface ProcessEnv {
    readonly MOUNT_PATH: string;
  }
}

declare module '@mapbox/mbtiles' {
  import fs from "fs";

  export interface Info {
    [key: string]: any;
    minzoom: number;
    maxzoom: number;
    bounds: [number, number, number, number];
    center: [number, number, number];
    scheme: 'xyz';
  }
  export interface TileHeaders {
    [key: string]: string;
  }
  class MBTiles {
    constructor(uri: string, callback: (err: Error | null, mbtiles?: MBTiles) => void);
    getInfo(callback: (err: Error | null, info?: Info) => void);
    getTile(z: number, x: number, y: number, callback: (err: Error | null, tileData?: Buffer, headers?: TileHeaders) => void);
    _stat: fs.Stats;
  }
  export default MBTiles;
}
