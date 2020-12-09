# Courtesy Call Monitor

Bot for the Keep Network to monitor an operators Keeps for courtesy calls.

## 1. Problem

The TBTC economic security model requires 150% collateralisation with ETH for the BTC in custody. At 125% the keep is put into a courtesy call for 6 hours before being liquidated. At 110% a liquidation is automatically triggered.

The 6 hour window from courtesy call to liquidation makes the active management of the node problematic due to the fluctuations in the BTC / ETH ratio.

## 2. Proposal

Build an open source bot for operators to run that is able to redeem keeps that are in courtesy call.

## 3. Challenges

The minting and redemption process moves the operators assets between chains. Both the mint and redeem require 6 confirmations on the Bitcoin chain, on average this should take an hour however it can take 2 - 3 hours depending on the network congestion.

Ideally a solution should be able to mint and redeem TBTC so that it can run without needing human intervention. Both the mint and redeem flow contain the following challenges.

- How to handle when a BTC transaction isn't put into a block with [CPFP](https://bitcoinelectrum.com/how-to-do-a-manual-child-pays-for-parent-transaction/).
- How to handle smart contract errors.
- What to do if gas fees spike due to network congestion.
- How to handle an unannounced ETH hardfork on the network causing deposits to never received an address. [As occurred on 11th November 2020](https://discord.com/channels/590951101600235531/723194718611308625/776924637107716107)

The Deposit flow has additional complexity as the edge cases for the networks state need to be accounted for.
![Image of deposit flow](https://docs.keep.network/tbtc/initiate-deposit.svg)

The main challenges in the deposit flow include:

- How to handle when there is insufficient ETH to mint 10 BTC lots.
- What to do in the event that a deposit is aggressively closed before the required number of confirmations.
- How to handle when a deposit enters "Signer Setup Failed" state during minting.

## 4. Design Consideration

A robust solution should have

- Multiple ways to access the network state.
- Heartbeat check.
- Multiple alerting options.

## 5. Approach

Taking a phasing the development.

### 5.1 - MVP

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

### 5.2 - Phase 2

Run the historical BTC and ETH data through the network on Ropsten.

### 5.2 - Phase 3

Adding minting TBTC from the redeemed BTC to maintain the bots balance of TBTC for redemptions.

Details TBD.

### 5.3 Phase 3

Handling insufficient ETH supply to mint via liquidity pools.

Details TBD.
