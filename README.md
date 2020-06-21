# sandbox-sls-efs

My sandbox EFS and Lambda with Serverless Framework

## Usage

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

## removal

```shell
$ npm run remove:app
$ npm run remove:storage
$ npm run remove:network
```
