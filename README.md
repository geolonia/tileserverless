# sandbox-sls-efs

My sandbox EFS and Lambda with Serverless Framework

## Deploy

```shell
$ git clone https://github.com/kamataryo/sandbox-sls-efs
$ cd sandbox-sls-efs
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
