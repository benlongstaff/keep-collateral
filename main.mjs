import fs from "fs";
import dotenv from "dotenv"
import KeepsExtractor from "./extractors/keeps.mjs";
import KeepsRedeemer from "./redeemers/keeps.mjs";

dotenv.config()
// node --experimental-json-modules main.mjs test

function printConfigInfo(operators, minBlock) {
  console.log(
    `==================================================================================`
  );
  console.log(
    "\x1b[36m%s\x1b[0m",
    "[INFO]\t",
    `Configured for operators:\t${operators}`
  );
  console.log(
    "\x1b[36m%s\x1b[0m",
    "[INFO]\t",
    `Infura Network:\t\t${process.env.INFURA_NETWORK}`
  );
  console.log(
    "\x1b[36m%s\x1b[0m",
    "[INFO]\t",
    `Infura Project ID:\t\t${process.env.INFURA_PROJECT_ID}`
  );
  console.log(
    `==================================================================================`
  );
  console.log(
    "\x1b[36m%s\x1b[0m",
    "[INFO]\t",
    `Loading keeps from block ${minBlock}`
  );

}

async function main() {
  let start = Date.now();
  let operators = process.env.OPERATORS.replace(/\s/g, "").split(",");
  let extractor = new KeepsExtractor();
  let redeemer = new KeepsRedeemer();
  let minBlock = extractor.getMinBlock();
  printConfigInfo(operators, minBlock);

  // STEP 1: check for new keeps
  await extractor.fetchNewKeeps(minBlock);
  let u1 = Date.now();
  console.log(
    "\x1b[36m%s\x1b[0m",
    "[INFO]\t",
    `fetching new keeps took ${(u1 - start) / 1000} seconds`
  );

  // STEP 2: get watchlist
  let watchlist = extractor.getWatchlist(operators);
  console.log(
    "\x1b[36m%s\x1b[0m",
    "[INFO]\t",
    `Added ${watchlist.length} items to the watchlist`
  );

  // STEP 3: check watchlist
  watchlist = await extractor.updateWatchlistStates(watchlist);
  let u2 = Date.now();
  console.log(
    "\x1b[36m%s\x1b[0m",
    "[INFO]\t",
    `updating watchlist took ${(u2 - u1) / 1000} seconds`
  );

  // STEP 4: process keeps
  await redeemer.processWatchlist(watchlist);
  let end = Date.now();
  console.log(
    "\x1b[36m%s\x1b[0m",
    "[INFO]\t",
    `ran for ${(end - start) / 1000} seconds`
  );
}

main().catch(err => {
  console.error(err);
});
