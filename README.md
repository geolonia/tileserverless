# Tileserverless

A Serverless Tile Server Kit.

Includes:

- Lambda & API Gateway
- CloudFront CDN

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

## How to use

When Tileserverless is deployed, an API Gateway (HTTP API) will be created. Serverless Framework will output the URL generated. You can use this directly or as the origin server in a CDN.

Replace `{ver}` in the URL with the filename (excluding the `.mbtiles` extension) of the MBTiles file you want to access in EFS.

For example, the name of the MBTiles file is `test-tiles-openstreetmap.mbtiles`. The URL to add to sources will be:

```
https://XXXXX.execute-api.xx-xxxx-1.amazonaws.com/test-tiles-openstreetmap/tiles.json
```

If you want to refer to files within a subdirectory, use `$` as a path delimiter.

The following example will serve a file called `test-tiles-openstreetmap` in the `prerelease` directory.

You can use `%24` if you are worried about URL encoding. The following two URLs are functionally equivalent.

```
https://XXXXX.execute-api.xx-xxxx-1.amazonaws.com/prerelease$test-tiles-openstreetmap/tiles.json
https://XXXXX.execute-api.xx-xxxx-1.amazonaws.com/prerelease%24test-tiles-openstreetmap/tiles.json
```
