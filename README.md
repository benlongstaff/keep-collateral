# Keep Collateral

This bot is designed to help operators manage the [courtesy call](https://docs.keep.network/tbtc/#pre-liquidation) events when their keeps become under collateralized.

More information on the design [here](docs/about.md)

## Setup

Create .env file

```
INFURA_PROJECT_ID=<INSERT_YOUR_PROJECT_ID>
INFURA_NETWORK=mainnet
OPERATORS=<INSERT_COMMA_SEPERATED_LIST_OF_OPERATORS>
MINBLOCK=0
COOLDOWN=5000
```

looked at using the CourtesyCalled events. this doesnt allow preemptive liquidations if price becomes highly volatile

## Tests

Run tests from the root of the project with

```
yarn test
```

## Code Style
Using the [Prettier Linter](https://atom.io/packages/prettier-atom)

## Testnet Links

### Faucets

#### BTC

https://bitcoinfaucet.uo1.net/send.php
https://testnet-faucet.mempool.co/
https://coinfaucet.eu/en/btc-testnet/

#### ETH

https://faucet.ropsten.be/

### Explorer

#### BTC

https://www.blockchain.com/btc-testnet/address/ms5hRa9oyEgLNMaSzyf1netcUiKNt4Nj8A

#### ETH

https://ropsten.etherscan.io/address/0xd4744aed3e43bc1366e79dc6dfd8d1ab6d315261

#### Keep Network

https://ropsten.allthekeeps.com/deposits

### dapps

#### TBTC

https://dapp.test.tbtc.network/deposit

ETH keystore password = test

Considerations
GasPrice too low
Transaction lost (no reason)

https://jestjs.io/docs/en/getting-started.html
