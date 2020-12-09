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
  constructor() {
    this.fileCacheName = "data/keeps.json";
    this.keepsFileCache = fs.existsSync(this.fileCacheName)
      ? JSON.parse(fs.readFileSync(this.fileCacheName))
      : {};
    this.ip = new ethers.providers.InfuraProvider(
      process.env.INFURA_NETWORK,
      process.env.INFURA_PROJECT_ID
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

  getMinBlock() {
    // in the future when the number of events is larger, this will allow us to
    // checkpoint the starting block if an operator wants to clear the data/keeps.json
    // file and run the script from scratch.
    let lastBlock = process.env.MINBLOCK;

    for (let address in this.keepsFileCache) {
      // the lastBlock will be used to limit the events returned when we look
      // for new keeps being created.
      if (this.keepsFileCache[address].block > lastBlock) {
        lastBlock = this.keepsFileCache[address].block;
      }
    }
    return parseInt(lastBlock) + 1;
  }

  getWatchlist(operators) {
    let watchlist = [];

    for (let address in this.keepsFileCache) {
      for (let operator of operators) {
        // check to see if one of the operators the script monitors for is a signer
        if (!this.keepsFileCache[address].signers.includes(operator)) {
          continue;
        }

        // check to see if the keep has a finalised state
        let state = this.keepsFileCache[address].state;
        if (this.finalStates.includes(state)) {
          continue;
        }

        watchlist.push(address);
        break;
      }
    }
    return watchlist;
  }

  async fetchNewKeeps(block) {
    const keeps = await this.ecdsaKFContract.queryFilter(
      this.ecdsaKFContract.filters.BondedECDSAKeepCreated(),
      block
    );
    console.log(
      "\x1b[36m%s\x1b[0m",
      "[INFO]\t",
      `Found ${keeps.length} keeps from block ${block}`
    );
    for (let keep of keeps) {
      await this.addKeepToCache(keep, 0);
    }
  }

  async addKeepToCache(keep, attempts) {
    attempts += 1;
    let address;

    try {
      address = keep.args.keepAddress.toLowerCase();
      const tdt = await this.depositLogContract.queryFilter(
        this.depositLogContract.filters.Created(null, address)
      );

      const deposit = new ethers.Contract(tdt[0].args[0], Deposit.abi, this.ip);
      //await sleep(300); // lazy way to avoid rate limiting in free infura account

      // create an entry with the attributes that we wont update.
      this.keepsFileCache[address] = {
        block: keep.blockNumber,
        deposit: tdt[0].args[0],
        lot: ethers.utils.formatEther(await deposit.lotSizeTbtc()),
        signers: keep.args.members,
        tdt: deposit.address
      };
      var data = JSON.stringify(this.keepsFileCache);
      fs.writeFile(this.fileCacheName, data, function(err) {
        if (err) {
          console.log(err);
        }
      });
      console.log(
        "\x1b[32m%s\x1b[0m",
        `[LIVE]\tadded ${address} to keeps cache`
      );
    } catch (err) {
      console.error(
        "\x1b[31m%s\x1b[0m",
        "[ERROR]\t",
        `Couldn't decorate Keep: ${address} \n ${err.message}`
      );

      if (attempts > 3) {
        process.exit(1);
      }
      console.log(
        "\x1b[36m%s\x1b[0m",
        "[INFO]\t",
        `attempt ${attempts} sleeping for ${(process.env.COOLDOWN * attempts) /
          1000} seconds`
      );
      await sleep(process.env.COOLDOWN * attempts);
      await this.addKeepToCache(keep, attempts);
    }
  }

  async updateWatchlistStates(watchlist) {
    for (let address of watchlist) {
      await this.updateKeepState(address, 0);
      console.log(
        "\x1b[42m%s\x1b[0m\t",
        `${this.keepsFileCache[address].state}`,`with ${this.keepsFileCache[address].collateralization}% collateralization`
      );
    }
  }

  async updateKeepState(address, attempts) {
    attempts += 1;
    try {
      if (!(address in this.keepsFileCache)) {
        console.error(
          "\x1b[31m%s\x1b[0m",
          "[ERROR]\t",
          `${address} not in keepsFileCache`
        );
        return;
      }

      const deposit = new ethers.Contract(
        this.keepsFileCache[address].deposit,
        Deposit.abi,
        this.ip
      );
      // await sleep(300); // lazy way to avoid rate limiting in free infura account

      this.keepsFileCache[address].state = this.states[
        await deposit.currentState()
      ];
      this.keepsFileCache[
        address
      ].collateralization = await deposit.collateralizationPercentage();
      var data = JSON.stringify(this.keepsFileCache);
      fs.writeFile(this.fileCacheName, data, function(err) {
        if (err) {
          console.log(err);
        }
      });
      console.log(
        "\x1b[32m%s\x1b[0m",
        `[LIVE]\t`,`updated ${address} state in keeps cache\t`
      );
    } catch (err) {
      console.error(
        "\x1b[31m%s\x1b[0m",
        "[ERROR]\t",
        `Couldn't update Keep: ${address} \n ${err.message}`
      );

      if (attempts > 3) {
        process.exit(1);
      }
      console.log(
        "\x1b[36m%s\x1b[0m",
        "[INFO]\t",
        `Attempt ${attempts} sleeping for ${(process.env.COOLDOWN * attempts) /
          1000} seconds`
      );
      await sleep(process.env.COOLDOWN * attempts);
      await this.updateKeepState(address, attempts);
    }
  }
}

module.exports = {
  Extractor: Extractor
};
