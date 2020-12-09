const fs = require("fs"); // file system
const ethers = require("ethers");

const TBTCSystem = require("@keep-network/tbtc/artifacts/TBTCSystem.json");

class Extractor {
  constructor() {
    this.ip = new ethers.providers.InfuraProvider(
      "homestead",
      process.env.INFURA_API
    );

    this.TBTCSystemContract = new ethers.Contract(
      TBTCSystem.networks["1"].address,
      TBTCSystem.abi,
      this.ip
    );
  }

  async fetchCourtesyCalls(block) {
    const events = await this.TBTCSystemContract.queryFilter(
      this.TBTCSystemContract.filters.CourtesyCalled(), block
    );
    console.log(`We have ${events.length} courtesy call events`);
    return events;
  }
}

module.exports = {
  Extractor: Extractor
};
