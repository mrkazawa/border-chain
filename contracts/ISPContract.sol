pragma solidity >=0.4.25 <0.6.0;

contract ISPContract {
    address public owner;

    constructor() public {
		owner = msg.sender;
	}

    modifier onlyOwner() {
        require(msg.sender == owner, 'only for owner');
        _;
    }

    function verifyGateway(address contractAddress, bytes32 IPFSHash, address gateway) public
    onlyOwner() {
        RegistryContract RC = RegistryContract(contractAddress);
        RC.verifyAuthNGateway(IPFSHash, gateway);
    }
}

interface RegistryContract {
   function verifyAuthNGateway(bytes32 IPFSHash, address gateway) external;
}