## 1/1/20

### Achieved

- Forking mainnet locally with Hardhat
- Configuring TBTC to make calls with the forked version of mainnet
- Getting TBTC balance to test with by impersonating accounts on the fork.

### Blockers

- Adding timeout in TBTC.js when a call fails, currently the process gets stuck.

### Next Steps

- Testing handling multiple redemptions in parallel

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
