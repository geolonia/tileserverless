# tileserverless

A Serverless Tile Server Kit.

## Deploy

```shell
$ git clone https://github.com/geolonia/tileserverless
$ cd tileserverless
$ yarn
$ cp .envrc.sample .envrc
$ vi .envrc
$ npm run deploy:network
$ npm run deploy:storage
$ npm run deploy:app
```

And update The fileSystem mount configuration manually.

## Run function

```shell
$ npx sls invoke -f write -d '{"name": "kamata"}'
$ npx sls invoke -f read
```

## removal

```shell
$ npm run remove:app
$ npm run remove:storage
$ npm run remove:network
```
