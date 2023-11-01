import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying to: SEPOLIA");
    console.log("Deployer: " + deployer.address);

    const easTokenContract = await deployERC20(deployer);
    const easNFTContract = await deployNFT(deployer);

    const erc20Address = await easTokenContract.getAddress();

    const ethereumAvatarService = await deployExpressions(deployer, erc20Address);

    console.log("Deployed all");





}


async function deployExpressions(deployer: HardhatEthersSigner, erc20Adress: string) {
    const ESCROW_COST = 10;

    const deployedContract = await ethers.deployContract("EthereumAvatarService", [erc20Adress, ESCROW_COST]);
    await deployedContract.waitForDeployment();
    console.log("Deployed Expressions at: " + await deployedContract.getAddress() + " by: " + await deployer.getAddress());

    return deployedContract;
}

async function deployERC20(deployer: HardhatEthersSigner) {
    const deployedContract = await ethers.deployContract("EASToken", ["Ethereum Avatar Service", "EAS"]);
    await deployedContract.waitForDeployment();
    console.log("Deployed ERC20 contract at: " + await deployedContract.getAddress() + " by: " + await deployer.getAddress());

    return deployedContract;
}

async function deployNFT(deployer: HardhatEthersSigner) {
    const deployedContract = await ethers.deployContract("EASCats", ["EAS Cats", "EASC"]);
    await deployedContract.waitForDeployment();
    console.log("Deployed NFT contract at: " + await deployedContract.getAddress() + " by: " + await deployer.getAddress())

    return deployedContract;
}



// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
