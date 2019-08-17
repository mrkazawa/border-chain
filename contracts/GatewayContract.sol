pragma solidity >=0.4.25 <0.6.0;

contract GatewayContract {
    address public owner;

    constructor() public {
		owner = msg.sender;
	}

    modifier onlyOwner() {
        require(msg.sender == owner, 'only for GatewayContract owner');
        _;
    }

    function verifyDevice(address contractAddress, bytes32 IPFSHash, address gateway, address device) public
    onlyOwner() {
        RegistryContract RC = RegistryContract(contractAddress);
        RC.verifyAuthNDevice(IPFSHash, gateway, device);
    }

    function isPayloadValid(address contractAddress, bytes32 IPFSHash) public view
    onlyOwner()
    returns (bool) {
        RegistryContract RC = RegistryContract(contractAddress);
        return RC.isValidPayloadForVerifier(IPFSHash);
    }
}

interface RegistryContract {
   function verifyAuthNDevice(bytes32 IPFSHash, address gateway, address device) external;
   function isValidPayloadForVerifier(bytes32 IPFSHash) external view returns (bool);
}