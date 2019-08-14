pragma solidity >=0.4.25 <0.6.0;

contract ISPContract {
    address public owner;

    constructor() public {
		owner = msg.sender;
	}

    modifier onlyOwner() {
        require(msg.sender == owner, 'only for ISPContract owner');
        _;
    }

    function verifyGateway(address contractAddress, bytes32 IPFSHash, address gateway) public
    onlyOwner() {
        RegistryContract RC = RegistryContract(contractAddress);
        RC.verifyAuthNGateway(IPFSHash, gateway);
    }

    function isPayloadValid(address contractAddress, bytes32 IPFSHash) public view
    onlyOwner()
    returns (bool) {
        RegistryContract RC = RegistryContract(contractAddress);
        return RC.isValidPayloadForVerifier(IPFSHash);
    }
}

interface RegistryContract {
   function verifyAuthNGateway(bytes32 IPFSHash, address gateway) external;
   function isValidPayloadForVerifier(bytes32 IPFSHash) external view returns (bool);
}