//@ts-ignore
import MBTiles from "@mapbox/mbtiles";
import path from "path";
import express from "express";

const getTile = (
  z: number | string,
  x: number | string,
  y: number | string
) => {
  return new Promise<Buffer>((resolve, reject) => {
    return new MBTiles(
      path.resolve(__dirname, "..", "..", "data", "nps.mbtiles"),
      (error: any, mbtiles: any) => {
        if (error) {
          reject(error);
        } else {
          mbtiles.getTile(z, x, y, (error: any, data: any, headers: any) => {
            if (error) {
              reject(error);
            } else {
              resolve(data);
            }
          });
        }
      }
    );
  });
};

const app = express();

app.get("/tiles/:z/:x/:y.mvt", async (req, res) => {
  const tile_data = await getTile(req.params.z, req.params.x, req.params.y);
  res.set("Access-Control-Allow-Origin", "*");
  res.send(tile_data);
});

app.listen(3000);
