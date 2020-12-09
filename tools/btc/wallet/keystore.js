const fs = require('fs');
const ethers = require('ethers');
const bitcoin = require('bitcoinjs-lib');
const wif = require('wif')

const TESTNET = bitcoin.networks.testnet;

async function main() {
  let keyPair;
  let filename = 'btc.wif'
  if(fs.existsSync(filename)) {
    console.error('\x1b[31m%s\x1b[0m',`${filename} already exists.`);
    privateKey = fs.readFileSync(filename)
    keyPair = bitcoin.ECPair.fromPrivateKey(privateKey, { network: TESTNET });
  } else {
    keyPair = bitcoin.ECPair.makeRandom({ network: TESTNET });
    // NOTE wif.encode(239, ...) is for testnet
    var key = wif.encode(239, Buffer.from(privateKey.toString('hex'), 'hex'), true)
    console.log(`private key:${key}`)
    fs.writeFile(filename, key, function(err) {
      if (err) {
        console.log(err);
      }
    });
  }

  const { address } = bitcoin.payments.p2pkh({
    pubkey: keyPair.publicKey,
    network: TESTNET,
  });
	console.log(`Address: ${address}\n`)
  console.log(keyPair)

}

main().catch(err => {
	console.error(err);
})
