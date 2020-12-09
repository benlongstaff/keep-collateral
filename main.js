const fs = require("fs"); // file system
const ethers = require("ethers");

let KeepsExtractor = require("./extractors/keeps.js").Extractor;

async function main() {
  let operator = process.env.OPERATOR;
  let lastBlock = 11276900; //11024463;
  let watchlist = JSON.parse(fs.readFileSync("data/watchlist.json"));
  let extractor = new KeepsExtractor(watchlist);
  let keeps = await extractor.fetchKeeps(lastBlock);

  console.log(`[FOUND] ${Object.keys(keeps).length}`)
  for (var address in keeps) {
    if (keeps[address].signers.includes(operator) && keeps[address].state === "ACTIVE") {
      console.log(`MATCH ${operator} on ${address} at ${keeps[address].block}`)
      // if we found a new keep to watch
      if (watchlist.includes(address)) {
        watchlist.push(address)
      }
    }
  }
  var data = JSON.stringify(watchlist);
  fs.writeFile("data/watchlist.json", data, function(err) {
    if (err) {
      console.log(err);
    }
  });
  // let depositExtractor = new DepositExtractor();
  // let deposits = await depositExtractor.fetch(events)
  // //console.log(events)

}

main().catch(err => {
  console.error(err);
});
