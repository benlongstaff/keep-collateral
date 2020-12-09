const fs = require("fs");
const ethers = require("ethers");
require("dotenv").config();

if (process.argv.length < 3 || !process.argv[2]) {
  console.error(
    "\x1b[36m%s\x1b[0m",
    "[USAGE]\t",
    "node keystore.js [password]"
  );
  process.exit(1);
}

async function main() {
  let walletFile = `${process.env.INFURA_NETWORK}_wallet.json`;
  if (fs.existsSync(walletFile)) {
    console.error(
      "\x1b[31m%s\x1b[0m",
      "[ERROR]\t",
      `${walletFile} already exists.`
    );
    process.exit(1);
  }
  const n = ethers.Wallet.createRandom();
  console.log(
    "\x1b[36m%s\x1b[0m",
    "[INFO]\t",
    `Address: ${await n.address}\nWriting wallet to ${walletFile}.\n`
  );

  try {
    fs.writeFileSync(walletFile, await n.encrypt(process.argv[2]), {
      flag: "wx+"
    });
  } catch (err) {
    console.error(
      "\x1b[31m%s\x1b[0m",
      "[ERROR]\t",
      `Could not write file: ${err.message}`
    );
  }
}

main().catch(err => {
  console.error(err);
});
