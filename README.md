# Keep Collateral

This bot is designed to help operators manage the [courtesy call](https://docs.keep.network/tbtc/#pre-liquidation) events when their keeps become under collateralized.

This code might be run by

- Node Operators looking to manage the Keeps in their Node
- Service providers offering to redeem Keeps in courtesy call for a fee

The TBTC economic security model requires 150% collateralisation with ETH for the BTC in custody. At 125% the keep is put into a courtesy call for 6 hours before being liquidated. At 110% a liquidation is automatically triggered.

The 6 hour window from courtesy call to liquidation makes the active management of the node problematic due to the fluctuations in the BTC / ETH ratio.

## Hackathon Summary

### Achieved

- Pulling Keeps states in a request efficient manner.
- Code to create testnet BTC addresses to test with.

### Blockers

- Signers on Ropsten where unresponsive when using the dapp to mint TBTC.
- Forking mainnet locally with Hardhat

### Next Steps

- Add redemption code as [outlined here](./docs/next.md).
- Write tests that verify correctness.

## 1. Design Challenges

The minting and redemption process moves the operators assets between chains. Both the mint and redeem require 6 confirmations on the Bitcoin chain, on average this should take an hour however it can take 2 - 3 hours depending on the network congestion.

Ideally a solution should be able to mint and redeem TBTC so that it can run without needing human intervention. Both the mint and redeem flow contain the following challenges.

- How to handle when a BTC transaction isn't put into a block with [CPFP](https://bitcoinelectrum.com/how-to-do-a-manual-child-pays-for-parent-transaction/).
- How to handle smart contract errors.
- What to do if gas fees spike due to network congestion.
- How to handle an unannounced ETH hardfork on the network causing deposits to never received an address. [As occurred on 11th November 2020](https://discord.com/channels/590951101600235531/723194718611308625/776924637107716107)
- How to handle retries if the gas price too low
- How to handle when a transaction is lost (no reason)

The [Deposit flow](https://docs.keep.network/tbtc/initiate-deposit.svg) has additional complexity as the edge cases for the networks state need to be accounted for, including:

- How to handle when there is insufficient ETH to mint 10 BTC lots.
- What to do in the event that a deposit is aggressively closed before the required number of confirmations.
- How to handle when a deposit enters "Signer Setup Failed" state during minting.

## 2. Design Consideration

A robust solution should have

- Multiple ways to access the ETH network state.
- Heartbeat check.
- Multiple alerting options.
- Minimual libraries.
- Process to verify correctness on testnet.

How the connection is made into the bitcoin network to send transactions will also be something to consider as constructing a BTC transaction is more complex than interacting with Ethereum. A common choice is bitcoinjs, however for our purpose tbtc.js looks like it will be a more appropriate choice.

## 3. Approach

Taking a phasing the development.

### MVP

Monitoring and Redemption
The purpose of this phase is to ensure that the system is correctly monitoring an operators Keeps and to handle redemption.

#### User stories

- An operator loads ETH and TBTC into a wallet, when the operators Keeps fall below the courtesy call threshold the bot redeems the Keeps with the available TBTC.
- When an operator's bot runs out of TBTC it sends a notification to the operator.
- If an operator has multiple Keeps receive a courtesy call the bot will process the redemptions in parallel if sufficient TBTC and ETH are available.

#### Acceptance Criteria

Submitting the BTC proof is good dapp etiquette however this is currently being handled by other scripts, for the MVP this step in the redemption flow will be skipped to save on the complexity of interacting with the BTC network.

- If the wallet is loaded with 10 TBTC tokens and sufficient ETH the bot will be able to redeem any of the following combinations
  - 1 x 10 BTC lot
  - 2 x 5 BTC lots
  - 10 x 1 BTC lots
- Shown to work correctly against historical data instead of live data on Ropsten.

#### Tasks

- Logging bot actions for audit.
- Handle connection to Ethereum to prevent timeouts and deal with rate limiting.
- Cache Keep data that is not active.
- Port Redemption from the dapp into a script.
- Add parallel support.

#### Testing

- Unit tests
- Wreck it on Ropsten

### Phase 2

Run the historical BTC and ETH data through the network on Ropsten.

### Phase 3

Adding minting TBTC from the redeemed BTC to maintain the bots balance of TBTC for redemptions.

Details TBD.

### Phase 3

Handling insufficient ETH supply to mint via liquidity pools.

Details TBD.

## 4. Setup

Signup to [Infura](https://infura.io/) and [Alchemy](alchemyapi.io)

Create an .env file

```
INFURA_PROJECT_ID=<INSERT_YOUR_PROJECT_ID>
INFURA_NETWORK=mainnet
OPERATORS=<INSERT_COMMA_SEPERATED_LIST_OF_OPERATORS>
MINBLOCK=0
COOLDOWN=5000
ROPSTEN_ECDSA_CONTRACT_ADDRESS=0x9EcCf03dFBDa6A5E50d7aBA14e0c60c2F6c575E6
ROPSTEN_TBTC_SYSTEM_CONTRACT_ADDRESS=0xc3f96306eDabACEa249D2D22Ec65697f38c6Da69
ALCHEMY_API=https://eth-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_API_KEY
```

For local development run a forked mainnet node. Create hardhat.config.js file in the root directory with

```
require("@nomiclabs/hardhat-waffle");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.7.3",
  networks: {
    hardhat: {
      from: "0xf9e11762d522ea29dd78178c9baf83b7b093aacc", //from: The address to use as the default sender, this address is a TBTC whale
      forking: {
        url: "https://eth-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_API_KEY",
        blockNumber: 11469780
      }
    }
  }
};

```

then run with

```
npx hardhat node --fork https://eth-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_API_KEY
```

looked at using the CourtesyCalled events. this doesnt allow preemptive liquidations if price becomes highly volatile

Running node v14.12.0

```
node main.js
```

## 5. Tests

Writing integration [tests](https://jestjs.io/docs/en/getting-started.html) needs to be done.

Stress testing the software requires running it on Ropsten to go through the process of minting and redemption. This requires coordination with the offchain network of Keep Network nodes.

Some testing can be done locally to ensure that the code is able to read the balances for the wallets and read the state of the Keeps correctly. This is done by forking mainnet locally using [hardhat](https://hardhat.org/guides/mainnet-forking.html).

## 6. Local Development

Forking mainnet at a specific block and running locally using [hardhat](https://hardhat.org/guides/mainnet-forking.html) means that we can write tests with a consistent output. It also reduces the amount of queries that need to go to main due to local caching. In addition its possible to impersonate mainnet accounts so that we can start with a TBTC balance.

Sign up for alchemy account
https://alchemyapi.io/

## 7. Rekt on Ropsten - Testnet Verification

The links below are to help with doing validation of the code on Ropsten.

- [TBTC ropsten dapp](https://dapp.test.tbtc.network/deposit)

### Faucets

The following faucets can be used to get testnet BTC and testnet ETH.

#### BTC

- [bitcoinfaucet.net](https://bitcoinfaucet.uo1.net/send.php),
- [mempool.co](https://testnet-faucet.mempool.co/),
- [coinfaucet.eu](https://coinfaucet.eu/en/btc-testnet/)

#### ETH

- [ropsten.be](https://faucet.ropsten.be/)
- [dimensions.network](https://faucet.dimensions.network/)
- [metamask.io](https://faucet.metamask.io/)
- [bitaps.com](https://teth.bitaps.com/)
- [kyber.network](https://faucet.kyber.network/)
- [ipfs.io](https://ipfs.io/ipfs/QmVAwVKys271P5EQyEfVSxm7BJDKWt42A2gHvNmxLjZMps/)

### Explorers

- [BTC](https://www.blockchain.com/btc-testnet/address/ms5hRa9oyEgLNMaSzyf1netcUiKNt4Nj8A)
- [ETH](https://ropsten.etherscan.io/address/0xd4744aed3e43bc1366e79dc6dfd8d1ab6d315261)
- [Keep Network](https://ropsten.allthekeeps.com/deposits)

## 8. Code Style

Using the [Prettier Linter](https://atom.io/packages/prettier-atom)

## 9. Auditing Existing libraries

There seem to be three approaches to sending transactions on BTC with js

- [bitpay](https://github.com/bitpay/bitcore/blob/master/packages/bitcore-lib/docs/examples.md#create-a-transaction)
- [bitcoinjs](https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/bip32.spec.ts)
- [tbtc.js](https://github.com/keep-network/tbtc.js)

Other packages appear to be wrappers around them.
