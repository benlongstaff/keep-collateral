Sending the transactions to redeem Keeps turned out to be more difficult than expected.

The code to redeem a deposit should be something like

```
import Web3 from "web3";
import TBTCToken from "@keep-network/tbtc/artifacts/TBTCToken.json";
import TBTC from "tbtc.js/src/TBTC.js";

async function main() {
  let rpcURL = "http://127.0.0.1:8545/";
  const web3 = new Web3(rpcURL);
  web3.eth.defaultAccount = (await web3.eth.getAccounts())[0];

  const tbtc = await TBTC.configure({
    web3: web3,
    bitcoinNetwork: "testnet",
    electrum: {
      testnet: {
        server: "electrumx-server.test.tbtc.network",
        port: 50002,
        protocol: "ssl"
      },
      testnetPublic: {
        server: "testnet1.bauerj.eu",
        port: 50002,
        protocol: "ssl"
      },
      testnetWS: {
        server: "electrumx-server.test.tbtc.network",
        port: 50003,
        protocol: "ws"
      }
    }
  });

  const deposit = await tbtc.Deposit.withAddress(
    "0xC309D0C7DC827ea92e956324F1e540eeA6e1AEaa"
  )
  const redemption = await deposit.requestRedemption(
    "SZt6evokJ6FSJMgx43L1uosoQpesh7DBjE"
  )
  // const redemption = await deposit.getCurrentRedemption()
  redemption.autoSubmit()

  await new Promise(resolve => {
    redemption.onWithdrawn(transactionID => {
      console.log(
        `Redeemed deposit ${deposit.address} with Bitcoin transaction ` +
          `${transactionID}.`
      )
      resolve()
    })
  })

```
