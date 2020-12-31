import dotenv from "dotenv";
import fs from "fs";
import Web3 from "web3";
import TBTC from "@keep-network/tbtc.js";
import TBTCToken from "@keep-network/tbtc/artifacts/TBTCToken.json";
import ProviderEngine from "web3-provider-engine";
import Subproviders from "@0x/subproviders";
import Deposit from "@keep-network/tbtc/artifacts/Deposit.json";

export default class Redeemer {
  constructor() {
    dotenv.config();
  }

  async connect() {
    // following example code from https://github.com/keep-network/tbtc.js/blob/master/examples/redeem.js
    let rpcURL = "http://127.0.0.1:8545/"; // testing with local fork of mainnet
    const engine = new ProviderEngine({ pollingInterval: 1000 });
    const privateKey = process.env.ETH_WALLET_PRIVATE_KEY;
    engine.addProvider(
      new Subproviders.PrivateKeyWalletSubprovider(privateKey)
    );
    engine.addProvider(new Subproviders.RPCSubprovider(rpcURL));

    this.web3 = new Web3(engine);
    engine.start();
    this.web3.eth.defaultAccount = (await this.web3.eth.getAccounts())[0];
    return;
    this.tbtc = await TBTC.withConfig(
      {
        web3: this.web3,
        bitcoinNetwork: process.env.BTC_NETWORK,
        electrum: {
          server: process.env.BTC_ELECTRUM_SERVER,
          port: process.env.BTC_ELECTRUM_PORT,
          protocol: process.env.BTC_ELECTRUM_PROTOCOL
        }
      },
      process.env.TBTCJS_NETWORK_CHECK == "true"
    );
  }

  async checkBalances(walletAddress) {
    let tbtcTokenAddress =
      process.env.INFURA_NETWORK === "mainnet"
        ? TBTCToken.networks[1].address
        : process.env.ROPSTEN_TBTC_TOKEN_CONTRACT_ADDRESS;
    console.log("TBTC TOKEN CONTRACT", tbtcTokenAddress);

    let tokenContract = new this.web3.eth.Contract(
      TBTCToken.abi,
      tbtcTokenAddress
    );

    console.log(walletAddress);
    let tbtcBalance = await tokenContract.methods
      .balanceOf(walletAddress)
      .call();
    console.log("TBTC", this.web3.utils.fromWei(tbtcBalance, "ether"));

    let wei = await this.web3.eth.getBalance(walletAddress);
    let ethBalance = this.web3.utils.fromWei(wei, "ether");
    console.log("ETH", ethBalance);
    return parseFloat(tbtcBalance);
  }

  async redeemDeposit(depositAddress, btcAddress) {
    const deposit = await tbtc.Deposit.withAddress(depositAddress);
    const redemption = await deposit.requestRedemption(btcAddress);
    redemption.autoSubmit();

    await new Promise(resolve => {
      redemption.onWithdrawn(transactionID => {
        console.log(
          `Redeemed deposit ${deposit.address} with Bitcoin transaction ` +
            `${transactionID}.`
        );
        resolve();
      });
    });
  }

  async processWatchlist(watchlist) {
    await this.connect()
    let ethWalletAddress = process.env.ETH_WALLET_PUBLIC_KEY;
    let btcWalletAddress = process.env.BTC_WALLET_PUBLIC_KEY;

    // check funds in wallet
    let tbtcBalance = await this.checkBalances(ethWalletAddress);

    console.log(watchlist);
    for (var i = 0; i < watchlist.length; i++) {
      if (
        tbtcBalance > parseFloat(watchlist[i].lot) &&
        parseFloat(watchlist[i].collateralization) <
          process.env.COLLATERALISATION_THRESHOLD
      ) {
       await this.redeemDeposit(watchlist[i].deposit, btcWalletAddress);
       tbtcBalance = await this.checkBalances(ethWalletAddress);
      }
    }
    process.exit(0)
  }
}
