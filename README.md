# Stability Platform off-chain infrastructure

This is a set of microservices and scripts for servicing the platform, running on a managed server.

## Features

* API
  * underlying APRs
  * proxying DeX aggregator APIs
* HardWork resolver
* Rebalance resolver

## Stack

* [nest](https://docs.nestjs.com/)
* [viem](https://viem.sh/docs/getting-started.html)
* [typeorm](https://typeorm.io/)

## How to

```bash
# install
yarn

# development
yarn start

# watch mode
yarn start:dev

# production mode
yarn start:prod

# unit tests
yarn test

# e2e tests
yarn test:e2e

# test coverage
yarn test:cov
```
