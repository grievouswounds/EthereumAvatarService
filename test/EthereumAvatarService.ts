import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { EthereumAvatarService__factory } from "../typechain-types";

describe("EthereumAvatarService", function () {
    async function deployEthereumAvatarService() {
        const EASTOKEN_ADDRESS = "0x1337000000000000000000000000000000000000";
        const ESCROW_COST = 10;

        const [deployer, user1, user2] = await ethers.getSigners();

        const EthereumAvatarService = await ethers.getContractFactory("EthereumAvatarService");
        const ethereumAvatarService = await EthereumAvatarService.deploy(EASTOKEN_ADDRESS, ESCROW_COST);

        return { ethereumAvatarService, deployer, user1, user2, ESCROW_COST, EASTOKEN_ADDRESS };
    }

    describe("Deployment", function () {
        it("Should set the right properties from the constructor", async function () {
            const { ethereumAvatarService, ESCROW_COST, EASTOKEN_ADDRESS } = await loadFixture(deployEthereumAvatarService);

            expect(await ethereumAvatarService.easToken()).to.equal(EASTOKEN_ADDRESS);
            expect(await ethereumAvatarService.escrowCost()).to.equal(ESCROW_COST);
        });
    });

    describe("Vaults", function () {
        it("Should create a vault", async function () {
            const { ethereumAvatarService, user1 } = await loadFixture(deployEthereumAvatarService);

            await ethereumAvatarService.connect(user1).createAvatarVault();
            expect(await ethereumAvatarService.getAvatarVault(user1)).to.not.equal(ethers.ZeroAddress);
        });

        it("Should not have a vault if not created", async function () {
            const { ethereumAvatarService, user1 } = await loadFixture(deployEthereumAvatarService);

            expect(await ethereumAvatarService.getAvatarVault(user1)).to.equal(ethers.ZeroAddress);
        });
    });
});
