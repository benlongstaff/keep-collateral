require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();
const TBTCToken = require("@keep-network/tbtc/artifacts/TBTCToken.json");

// This task it for use with a forked version of *mainnet*
// It impersonates a wallet with a large TBTC stack on mainnet and uses that
// wallet to transfer TBTC to the local ETH Wallet to test the redemption
// process using tbtc.js
//
// this task should be run when there is a forked version of mainnet already
// running locally
//
// npx hardhat accounts --network localhost

task("accounts", "Get TBTC to test with", async () => {

  // 1. SETUP

  const sender = process.env.HARDHAT_IMPERSONATE_WALLET;
  const receiver = process.env.ETH_WALLET_PUBLIC_KEY;

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [sender]
  });

  const signer = await ethers.provider.getSigner(sender);
  const contract = new ethers.Contract(
    TBTCToken.networks[1].address,
    TBTCToken.abi,
    signer
  );

  console.log(`Sender: ${sender}`);
  console.log(`Receiver: ${receiver}`);

  // 2. Transfer TBTC

  const amount = ethers.utils.parseUnits("100", 18);
  await contract.transfer(receiver, amount);

  let finalBalance = await contract.balanceOf(receiver);
  console.log(`\tReceived ${ethers.utils.formatUnits(amount, 18)} TBTC `);
  console.log(`\tFinal balance: ${finalBalance} TBTC`);

  // 3. Transfer ETH

  let provider = new ethers.getDefaultProvider();
  let senderEthBalance = await provider.getBalance(sender);
  // balance is a BigNumber (in wei); format is as a sting (in ether)
  console.log("Sender ETH Balance: " + ethers.utils.formatEther(senderEthBalance));

  let transaction = {
    to: receiver,
    value: ethers.utils.parseEther("10")
  };

  // Send the transaction
  await signer.sendTransaction(transaction);
  let receiverEthBalance = await provider.getBalance(receiver);
  // balance is a BigNumber (in wei); format is as a sting (in ether)
  console.log("Receiver ETH Balance: " + ethers.utils.formatEther(receiverEthBalance));

  // 4. Cleanup

  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [sender]
  });
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.7.3",
  networks: {
    hardhat: {
      chainId: parseInt(process.env.HARDHAT_CHAIN_ID),
      forking: {
        url: process.env.HARDHAT_URL,
        blockNumber: parseInt(process.env.HARDHAT_BLOCK)
      }
    }
  }
};
