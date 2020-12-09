const fs = require("fs"); // file system
const ethers = require("ethers");

const Deposit = require("@keep-network/tbtc/artifacts/Deposit.json");
const BondedECDSAKeep = require("@keep-network/keep-ecdsa/artifacts/BondedECDSAKeep.json")

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class Extractor {
  constructor() {
    this.ip = new ethers.providers.InfuraProvider(
      "homestead",
      process.env.INFURA_API
    );
  }

  async fetch(events) {
    for (var i = 0; i < events.length; i++) {
      let address = events[i].args[0]
      console.log(`Deposit Address ${address}`)
      const deposit = new ethers.Contract(address, Deposit.abi, this.ip);
      let size = ethers.utils.formatEther(await deposit.lotSizeTbtc())
      await sleep(300);
      let collateralization = await deposit.collateralizationPercentage()
      console.log(`${100* collateralization}%`)
      console.log(collateralization)
      await sleep(300);
      const k = new ethers.Contract(await deposit.keepAddress(), BondedECDSAKeep.abi, this.ip);
  //    console.log(deposit)
      console.log(`Members: ${await k.getMembers()}`)
      await sleep(300);
      return events;
    }


    return events;
  }
}

module.exports = {
  Extractor: Extractor
};
