import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { EthereumAvatarService__factory } from "../typechain-types";

describe("AvatarVault", function () {
    async function deployEASToken() {
        const [deployer] = await ethers.getSigners();
        const name = "Ethereum Avatar Service";
        const tag = "EAS";

        const EASToken = await ethers.getContractFactory("EASToken");
        const easToken = await EASToken.deploy(name, tag);

        return { deployer, easToken };

    }

    async function deployEASCats() {
        const [deployer] = await ethers.getSigners();
        const name = "EAS Cats";
        const tag = "EASC";

        const EASCats = await ethers.getContractFactory("EASCats");
        const easCats = await EASCats.deploy(name, tag);

        return { deployer, easCats };
    }

    async function deployEthereumAvatarService() {
        const { easToken } = await deployEASToken();
        const EASTOKEN_ADDRESS = await easToken.getAddress();
        const ESCROW_COST = 10;

        const [deployer] = await ethers.getSigners();

        const EthereumAvatarService = await ethers.getContractFactory("EthereumAvatarService");
        const ethereumAvatarService = await EthereumAvatarService.deploy(EASTOKEN_ADDRESS, ESCROW_COST);

        return { ethereumAvatarService, easToken, deployer };
    }

    async function deployAvatarVault() {
        const [deployer, user1, user2] = await ethers.getSigners();

        const { ethereumAvatarService, easToken } = await deployEthereumAvatarService();
        const { easCats } = await deployEASCats();
        await ethereumAvatarService.connect(user1).createAvatarVault();

        const avatarVaultAddress = await ethereumAvatarService.getAvatarVault(await user1.getAddress());
        const avatarVault = await ethers.getContractAt("AvatarVault", avatarVaultAddress);

        return { ethereumAvatarService, easToken, easCats, avatarVault, user1, user2 };

    }

    describe("Deployment", function () {
        it("Should set the right properties from the constructor", async function () {
            const { avatarVault, easToken, ethereumAvatarService, user1 } = await loadFixture(deployAvatarVault);

            expect(await avatarVault.owner()).to.equal(await user1.getAddress());
            expect(await avatarVault.easToken()).to.equal(await easToken.getAddress());
            expect(await avatarVault.escrowCost()).to.equal(await ethereumAvatarService.escrowCost());
        });
    });

    describe("Depositing", function () {
        describe("Escrow", function () {
            it("Should allow deposit with escrow if sufficient EAS token balance approval and approved avatar", async function () {
                const { avatarVault, easToken, easCats, ethereumAvatarService, user1 } = await loadFixture(deployAvatarVault);
                await easToken.connect(user1).faucet();
                await easToken.connect(user1).approve(await avatarVault.getAddress(), await ethereumAvatarService.escrowCost());
                await easCats.connect(user1).mint();
                await easCats.connect(user1).approve(await avatarVault.getAddress(), 0);

                await avatarVault.connect(user1).setAvatarWithEscrow(await easCats.getAddress(), 0);

                expect(await avatarVault.avatarAddress()).to.equal(await easCats.getAddress());
                expect(await avatarVault.avatarID()).to.equal(0);
                expect(await avatarVault.depositedCoins()).to.equal(await ethereumAvatarService.escrowCost());
                expect(await avatarVault.vaultIsActive()).to.equal(true);
                expect(await avatarVault.vaultMode()).to.equal(1);
            });

            it("Should not allow deposit with escrow if insufficient EAS token balance approval", async function () {
                const { avatarVault, easToken, easCats, ethereumAvatarService, user1 } = await loadFixture(deployAvatarVault);
                await easCats.connect(user1).mint();
                await easCats.connect(user1).approve(await avatarVault.getAddress(), 0);

                await expect(avatarVault.connect(user1).setAvatarWithEscrow(await easCats.getAddress(), 0)).to.be.revertedWith("ERC20: insufficient allowance");
            });

            it("Should not allow deposit with escrow if not approved avatar", async function () {
                const { avatarVault, easToken, easCats, ethereumAvatarService, user1 } = await loadFixture(deployAvatarVault);
                await easToken.connect(user1).faucet();
                await easToken.connect(user1).approve(await avatarVault.getAddress(), await ethereumAvatarService.escrowCost());
                await easCats.connect(user1).mint();

                await expect(avatarVault.connect(user1).setAvatarWithEscrow(await easCats.getAddress(), 0)).to.be.revertedWith("ERC721: caller is not token owner or approved");
            });
        });

        describe("Self Custody", function () {
            it("Should allow deposit with self custody if sufficient EAS token balance and owner of avatar", async function () {
                const { avatarVault, easToken, easCats, user1 } = await loadFixture(deployAvatarVault);
                const paymentSize = 33;
                await easToken.connect(user1).faucet();
                await easToken.connect(user1).approve(await avatarVault.getAddress(), paymentSize);
                await easCats.connect(user1).mint();

                await avatarVault.connect(user1).setAvatarWithSelfCustody(await easCats.getAddress(), 0, paymentSize);

                expect(await avatarVault.avatarAddress()).to.equal(await easCats.getAddress());
                expect(await avatarVault.avatarID()).to.equal(0);
                expect(await avatarVault.depositedCoins()).to.equal(paymentSize);
                expect(await avatarVault.vaultIsActive()).to.equal(true);
                expect(await avatarVault.vaultMode()).to.equal(2);
            });

            it("Should not allow deposit with self custody if not owner of avatar", async function () {
                const { avatarVault, easToken, easCats, user1, user2 } = await loadFixture(deployAvatarVault);
                const paymentSize = 33;
                await easToken.connect(user1).faucet();
                await easToken.connect(user1).approve(await avatarVault.getAddress(), paymentSize);
                await easCats.connect(user2).mint();

                await expect(avatarVault.connect(user1).setAvatarWithSelfCustody(await easCats.getAddress(), 0, paymentSize)).to.be.revertedWith("Not the owner");
            });
        });
    });

});
