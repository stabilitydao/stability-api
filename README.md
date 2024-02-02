# Stability Platform off-chain infrastructure

This is a set of microservices and scripts for servicing the platform, running on a managed server.

API endpoint: `https://api.stabilitydao.org`

## Features

* API
  * `/`
    * Underlyings
      * [x] Gamma QuickSwap Polygon
      * [x] DefiEdge strategies
  * `/swap/:chainId/:src/:dst/:amountIn`
    * [x] 1inch
    * [ ] openocean
* [x] HardWork service
* [x] Merkl HardWork service

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
