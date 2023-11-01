pragma solidity ^0.8.9;

import "./OpenZeppelinERC721/IERC721.sol";
import "./OpenZeppelinERC20/IERC20.sol";
/*
TODOS:
IERC721 in fields instead of creating a new one in different functions
Set selfCustodyUntil in expressWithEscrow() with real algo
Check that avatar that is being set is erc721 (and also has metadata?)
*/
contract AvatarVault {
    enum vaultModes{NONE, ESCROW, SELFCUSTODY}
    enum liquidationTypes{ESCROWAVATARMOVED, SELFCUSTODYTIMEOUT, SELFCUSTODYNEWOWNER}

    //Address of set avatar
    address public avatarAddress;

    //ID of set avatar
    uint256 public avatarID;

    //Address of vault owner
    address public owner;

    //Contract address of EAS coin
    IERC20 public easToken;

    //How many EAS tokens are required to set avatar via escrow
    uint256 public escrowCost;

    //If vault is active
    bool public vaultIsActive;

    //Which mode the vault is currently in
    vaultModes public vaultMode;

    //Until which block self custody is allowed
    uint256 public selfCustodyBlockDeadline;

    //Number of EAS tokens in the vault
    uint256 public depositedCoins;  //Number of deposited EAS tokens for self custody. Can be modified through liquidation

    //If the vault is in a liquidated state
    bool public liquidated;

    

    constructor(address _owner, address _easToken, uint256 _escrowCost) {
        owner = _owner;
        easToken = IERC20(_easToken);
        escrowCost = _escrowCost;
        resetVault();
    }

    function resetVault() internal{
        vaultIsActive = false;
        vaultMode = vaultModes.NONE;
        avatarAddress = address(0);
        avatarID = 0;
        selfCustodyBlockDeadline = 0;
        liquidated = false;
    }


    function setAvatarWithEscrow(address nftAddress, uint256 nftID) external onlyOwner {
        require(vaultMode == vaultModes.NONE);
        easToken.transferFrom(msg.sender, address(this), escrowCost);
        IERC721 nftContract = IERC721(nftAddress);
        nftContract.transferFrom(msg.sender, address(this), nftID);

        depositedCoins = escrowCost;
        avatarAddress = nftAddress;
        avatarID = nftID;
        vaultIsActive = true;
        vaultMode = vaultModes.ESCROW;
    }

    function withdrawEscrow() external onlyOwner{
        require(vaultMode == vaultModes.ESCROW, "Vault needs to be Escrow");
        IERC721 nftContract = IERC721(avatarAddress);
        uint256 vaultEACBalance = easToken.balanceOf(address(this));
        if(vaultEACBalance > 0){
            easToken.transfer(owner, depositedCoins);
        }

        //Transfer back NFT if haven't gotten liquidated through liquidateEscrowAvatarMoved()
        //If other liquidation methods for escrow are introduced, this if() condition must be changed to compare ownership of avatarID
        //Between this vault and current owner of the NFT
        if(!liquidated){
            nftContract.transferFrom(address(this), owner, avatarID);
        }

        resetVault();
    }

    function setAvatarWithSelfCustody(address nftAddress, uint256 nftID, uint256 paymentSize) external onlyOwner {
        require(vaultMode == vaultModes.NONE);
        easToken.transferFrom(msg.sender, address(this), paymentSize);
        IERC721 nftContract = IERC721(nftAddress);
        require(nftContract.ownerOf(nftID) == msg.sender, "Not the owner");

        depositedCoins = paymentSize;
        selfCustodyBlockDeadline = block.number + calculateSelfCustodyLength(paymentSize);
        avatarAddress = nftAddress;
        avatarID = nftID;
        vaultIsActive = true;
        vaultMode = vaultModes.SELFCUSTODY;
    }

    function withdrawSelfCustody() external onlyOwner{
        require(vaultMode == vaultModes.SELFCUSTODY, "Vault needs to be Self Custody");

        if(depositedCoins > 0){
            easToken.transfer(owner, depositedCoins);
        }

        resetVault();

    }


    function calculateSelfCustodyLength(uint256 numberOfTokens) public pure returns(uint256) {
        require(numberOfTokens > 0, "minimum 1 coin spend");
        return numberOfTokens + 1;
    }

    function liquidateEscrowAvatarMoved() external{
        require(vaultMode == vaultModes.ESCROW, "Vault needs to be in Escrow mode");
        require(!liquidated, "Vault can't be liquidated");
        IERC721 subjectAvatarContract = IERC721(avatarAddress);
        address currentOwner = subjectAvatarContract.ownerOf(avatarID);
        require(currentOwner != address(this), "Vault owns the avatar");

        uint256 liquidationAmount = depositedCoins;
        if(depositedCoins > 0){
            easToken.transfer(msg.sender, depositedCoins);
        }
        emit Liquidation(liquidationTypes.ESCROWAVATARMOVED, address(this), liquidationAmount);
        vaultIsActive = false;
        liquidated = true;
    }

    function liquidateSelfCustodyTimeOut() external{
        require(vaultMode == vaultModes.SELFCUSTODY, "Vault needs to be in Self Custody mode");
        require(!liquidated, "Vault can't be liquidated");
        require(block.number > selfCustodyBlockDeadline, "Vault Self Custody period has not expired");

        uint256 liquidationAmount = depositedCoins;

        if(depositedCoins > 0){
            easToken.transfer(msg.sender, depositedCoins);
            depositedCoins = 0;
        }
        emit Liquidation(liquidationTypes.SELFCUSTODYTIMEOUT, address(this), liquidationAmount);
        vaultIsActive = false;
        liquidated = true;
    }

    function liquidateSelfCustodyNewOwner() external {
        require(vaultMode == vaultModes.SELFCUSTODY, "Vault needs to be in Self Custody mode");
        require(!liquidated, "Vault can't be liquidated");
        IERC721 subjectAvatarContract = IERC721(avatarAddress);
        address currentOwner = subjectAvatarContract.ownerOf(avatarID);
        require(msg.sender == currentOwner, "Only the owner of the avatar can liquidate");

        uint256 liquidationAmount = depositedCoins;
        easToken.transfer(msg.sender, depositedCoins);
        depositedCoins = 0;
        emit Liquidation(liquidationTypes.SELFCUSTODYNEWOWNER, address(this), liquidationAmount);
        vaultIsActive = false;
        liquidated = true;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    event Liquidation(liquidationTypes indexed liquidationType, address indexed subjectVault, uint256 amount);
}
