require("@nomiclabs/hardhat-ethers");
require("hardhat-forta");
const { getJsonRpcUrl } = require("forta-agent");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    hardhat: {
      forking: {
        url: getJsonRpcUrl(),
        //blockNumber: 14800611,
      },
    },
  },
};
