declare namespace NodeJS {
  interface ProcessEnv {
    readonly MOUNT_PATH: string;
    readonly DEFAULT_MBTILES_FILENAME: string;
  }
}
