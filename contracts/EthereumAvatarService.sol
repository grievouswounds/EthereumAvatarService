pragma solidity ^0.8.9;
import "./AvatarVault.sol";
import "./OpenZeppelinERC20/IERC20.sol";

contract EthereumAvatarService {
    address private owner;
    address public easToken;
    uint256 public escrowCost;

    mapping(address => AvatarVault) public avatarVaults;

    constructor(address _easToken, uint256 _escrowCost) {
        owner = msg.sender;
        easToken = _easToken;
        escrowCost = _escrowCost;
    }

    function createAvatarVault() public {
        require(
            address(avatarVaults[msg.sender]) == address(0),
            "Only 1 avatar vault per address"
        );
        AvatarVault newVault = new AvatarVault(msg.sender, easToken, escrowCost);
        avatarVaults[msg.sender] = newVault;
    }

    function getAvatarVault(address desiredOwner) external view returns (address) {
        return address(avatarVaults[desiredOwner]);
    }
}
