pragma solidity >=0.4.25 <0.6.0;

contract Network {
    address public owner;
    address public roosterAddress;

    constructor() public {
		owner = msg.sender;
	}

    modifier onlyOwner() {
        require(msg.sender == owner, "only the owner can do this");
        _;
    }

    modifier onlyRooster() {
        require(msg.sender == roosterAddress, "only the rooster contract can do this");
        _;
    }

    function setRoosterAddress(address addr) public onlyOwner {
        roosterAddress = addr;
    }

    function doAuthN(uint IPFS_hash) public returns(uint) {
        // TODO: Add only rooster verifier
        // check if the message sender is Rooster Contract
        // notify the ISP authentication service by emmiting event
        return IPFS_hash + 100;
    }
}