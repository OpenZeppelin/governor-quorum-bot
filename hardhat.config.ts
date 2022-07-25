/** @type import('hardhat/config').HardhatUserConfig */
require("@nomiclabs/hardhat-waffle");
import "hardhat-forta";
import { getJsonRpcUrl } from "forta-agent";

module.exports = {
  solidity: "0.8.9",
  networks: {
    hardhat: {
      forking: {
        url: getJsonRpcUrl(),
      }
    }
  }
};
