# Tileserverless

A Serverless Tile Server Kit.

## Prerequisite

- AWS resource
    - EFS
    - Security Group for EFS (Allow TCP 2049 from the Lambda)
    - VPC for EFS

- MBTiles should be uploaded as tiles.mbtiles` at the EFS

## Deploy

```shell
$ git clone https://github.com/geolonia/tileserverless
$ cd tileserverless
$ yarn
$ cp .envrc.sample .envrc
$ vi .envrc
$ npm run deploy:dev
```

## Removal

```shell
$ npm run remove:dev
```
