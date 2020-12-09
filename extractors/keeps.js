const fs = require("fs"); // file system
const ethers = require("ethers");
const BondedECDSAKeep = require("@keep-network/keep-ecdsa/artifacts/BondedECDSAKeep.json");
const BondedECDSAKeepFactory = require("@keep-network/keep-ecdsa/artifacts/BondedECDSAKeepFactory.json");
const DepositLog = require("@keep-network/tbtc/artifacts/DepositLog.json");
const TBTCSystem = require("@keep-network/tbtc/artifacts/TBTCSystem.json");
const Deposit = require("@keep-network/tbtc/artifacts/Deposit.json");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class Extractor {
  constructor(watchlist) {
    this.watchlist = watchlist;
    this.fileCacheName = "data/keeps.json";
    this.keepsFileCache = JSON.parse(fs.readFileSync(this.fileCacheName));

    this.ip = new ethers.providers.InfuraProvider(
      "homestead",
      process.env.INFURA_API
    );

    this.states = [
      "START",
      "AWAITING_SIGNER_SETUP",
      "AWAITING_BTC_FUNDING_PROOF",
      "FAILED_SETUP",
      "ACTIVE", // includes courtesy call
      "AWAITING_WITHDRAWAL_SIGNATURE",
      "AWAITING_WITHDRAWAL_PROOF",
      "REDEEMED",
      "COURTESY_CALL",
      "FRAUD_LIQUIDATION_IN_PROGRESS",
      "LIQUIDATION_IN_PROGRESS",
      "LIQUIDATED"
    ];

    this.finalStates = ["FAILED_SETUP", "REDEEMED", "LIQUIDATED"];

    this.ecdsaKFContract = new ethers.Contract(
      BondedECDSAKeepFactory.networks["1"].address,
      BondedECDSAKeepFactory.abi,
      this.ip
    );

    this.depositLogContract = new ethers.Contract(
      TBTCSystem.networks["1"].address,
      DepositLog.abi,
      this.ip
    );
  }

  async fetchKeeps(block) {
    const keeps = await this.ecdsaKFContract.queryFilter(
      this.ecdsaKFContract.filters.BondedECDSAKeepCreated(),
      block
    );
    console.log(`We have ${keeps.length} keeps`);
    return await this.decorateKeeps(keeps);
  }

  async decorateKeeps(keeps) {
    let retval = {};
    // get keep state
    for (let keep of keeps) {
      let address = keep.args.keepAddress.toLowerCase();
      // if we have already seen the keep and its state is finalised or not in our watchlist use the cached value
      if (address in this.keepsFileCache) {
        let state = this.keepsFileCache[address].state;
        if (!(this.watchlist.includes(address)) || this.finalStates.includes(state)) {
          retval[address] = this.keepsFileCache[address];
          // console.log(`[cached] ${address}`);
          continue;
        }
      }
      retval[address] = await this.decorateKeep(keep, 0);

      var data = JSON.stringify(this.keepsFileCache);
      fs.writeFile(this.fileCacheName, data, function(err) {
        if (err) {
          console.log(err);
        }
      });
    }
    return retval;
  }

  async decorateKeep(keep, attempts) {
    attempts += 1;
    try {
      let address = keep.args.keepAddress.toLowerCase();
      const tdt = await this.depositLogContract.queryFilter(
        this.depositLogContract.filters.Created(null, address)
      );
      if (tdt.length < 1) {
        console.log(`ERROR: tdt length 0 for ${address}`);
        return;
      }
      const deposit = new ethers.Contract(tdt[0].args[0], Deposit.abi, this.ip);
      const k = new ethers.Contract(address, BondedECDSAKeep.abi, this.ip);
      await sleep(300); // lazy way to avoid rate limiting in free infura account
      await sleep(300); // lazy way to avoid rate limiting in free infura account

      this.keepsFileCache[address] = {
        tdt: deposit.address,
        state: this.states[await deposit.currentState()],
        lot: ethers.utils.formatEther(await deposit.lotSizeTbtc()),
        isClosed: await k.isClosed(),
        isTerminated: await k.isTerminated(),
        block: keep.blockNumber,
        signers: keep.args.members,
        collateralization: await deposit.collateralizationPercentage(),
      };
      console.log(`[live] ${address} has state: ${this.keepsFileCache[address].state} \n collateralization ${this.keepsFileCache[address].collateralization}`);

      return this.keepsFileCache[address];
    } catch (err) {
      console.log(`attempt ${attempts} decorating keep ${address}`);
      if (attempts > 3) {
        console.error(`Could decorate Keep: ${address} \n ${err.message}`);
        process.exit(1);
      }
      console.log("sleeping");
      await sleep(2000);
      return await this.decorateKeep(keep, attempts);
    }
  }
}

module.exports = {
  Extractor: Extractor
};
