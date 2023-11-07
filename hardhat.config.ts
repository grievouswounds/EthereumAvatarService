require('dotenv').config();
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";


const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks: {
    hardhat: {
      mining: {
        auto: true,
        // interval: 3000
      }
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
      accounts: [`${process.env.DEPLOYER_PRIV_KEY}`]

    }
  }
};

export default config;
