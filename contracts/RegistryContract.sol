pragma solidity >=0.4.25 <0.6.0;

contract RegistryContract {
    struct Payload {
		address target;
		address verifier;
        bool isValue;
	}

    struct Device {
        address devicesAddr;
        bool isValue;
    }

    address public owner;
    mapping (bytes32 => Payload) payloads;
    Device[] devices;
    mapping (address => Device[]) trustedGateways;

    event NewPayloadAdded(address sender, bytes32 IPFSHash);

    constructor() public {
		owner = msg.sender;
	}

    modifier payloadMustExist(bytes32 IPFSHash) {
        require(payloads[IPFSHash].isValue, "payload must exist");
        _;
    }

    modifier payloadMustNotExist(bytes32 IPFSHash) {
        require(!payloads[IPFSHash].isValue, "payload must not exist");
        _;
    }

    function storeAuthNPayload(bytes32 IPFSHash, address verifier) public payloadMustNotExist(IPFSHash) {
        Payload storage p = payloads[IPFSHash];
        p.target = msg.sender;
        p.verifier = verifier;
        p.isValue = true;

        emit NewPayloadAdded(msg.sender, IPFSHash);
    }

    function isPayloadExistForVerifier(bytes32 IPFSHash) public view payloadMustExist(IPFSHash) returns(bool) {
        return (payloads[IPFSHash].verifier == msg.sender);
    }

    // check if given address is trusted gateway
    // check if given address is trusted device

    // TODO: delete trusted gateway, use below code
    // delete trustedGateways[address];

    function getValue(uint initial) public returns(uint) {
        return initial + 150;
    }

}