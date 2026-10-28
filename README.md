# Tileserverless

A Serverless Tile Server Kit.

Includes:

- Lambda & API Gateway
- CloudFront CDN

## ブランチ運用ルール（重要）

- このリポジトリの default branch は `develop` です。GitHub の organization rule (branch protection) が保護しているのはこの `develop` のみで、`main` は保護対象外です。
- ただし `main` が組織ルールで保護されていない場合であっても、`develop` を経由せず `main` へ直接変更を加えることは禁止です。
- `main` への直接変更は、staging 環境での動作確認をスキップして production 環境へ変更を適用することを意味するため、原則として許可されません。
- production 環境が staging 環境よりも進んでいる（内容が乖離している）状態を発生させてはいけません。
- PR は必ず `develop` を経由して `main` に取り込んでください。feature/fix ブランチは `develop` から作成し、`develop` を base に PR を作成してください。
- PR の base branch を `main` に向けてはいけません。

## Prerequisite

- AWS resources
    - EFS, with an access point
    - VPC for EFS
    - Security Group for the Lambda functions (EFS must allow TCP 2049 from it)
- MBTiles should be uploaded as XXX.mbtiles in EFS
- Node.js 22 or 24, yarn 1, and [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

## Development

```shell
$ yarn
$ yarn test
```

## Deploy

Deployment uses AWS SAM (`template.yaml`, `samconfig.toml`). GitHub Actions deploys `develop` to the `dev` stage (stack `tileserverless-sam-dev`) and `main` to the `v1` stage (stack `tileserverless-sam-v1`).

`sam build` installs the production dependencies with the `Makefile`. They include sqlite3, a native module, so build on Linux x86_64 to get a binary that runs on Lambda. The `Makefile` stops on other platforms.

To deploy by hand:

```shell
$ cp .envrc.sample .envrc
$ vi .envrc
$ source .envrc
$ yarn sam:build
$ sam deploy --config-env default --parameter-overrides \
    Stage=dev NameSuffix=-sam \
    "SecurityGroupIds=$TILESERVERLESS_SECURITY_GROUP_ID" \
    "SubnetIds=$TILESERVERLESS_SUBNET_ID" \
    "FileSystemAccessPointId=$TILESERVERLESS_FILESYSTEM_ACCESS_POINT_ID" \
    "CloudFrontDomainName=$CLOUDFRONT_DOMAIN_NAME"
```

Use `--config-env v1` and `Stage=v1` for the `v1` stage.

After a deployment, check the API (CI does this too):

```shell
$ node scripts/check-deployment.js https://XXXXX.execute-api.ap-northeast-1.amazonaws.com [tileset]
```

To compare two deployments, for example before switching CloudFront to a new stack:

```shell
$ node scripts/compare-endpoints.js https://OLD.execute-api.ap-northeast-1.amazonaws.com https://NEW.execute-api.ap-northeast-1.amazonaws.com \
    /tileset/tiles.json /tileset/metadata.json /tileset/tiles/0/0/0.pbf
```

## Removal

```shell
$ sam delete --config-env default
```

## How to use

When Tileserverless is deployed, an API Gateway (HTTP API) will be created. `sam deploy` outputs its URL as `HttpApiUrl`. You can use this directly or as the origin server in a CDN.

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
