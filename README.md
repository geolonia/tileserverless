# Tileserverless

A Serverless Tile Server Kit.

## Prerequisite

- AWS resource
    - EFS
    - Security Group for EFS (Allow TCP 2049 from the Lambda)
    - VPC for EFS
- DNS server
- MBTiles should be uploaded as XXX.mbtiles in EFS

## Deploy

If you don't use Linux, use Docker to compile the local dependencies:

```shell
docker run --rm -v "$PWD":/var/task --entrypoint="bash" amazon/aws-lambda-nodejs:14 "-c" "yum groupinstall -y \"Development Tools\" && npm rebuild"
```

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
