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

    constructor() public {
		owner = msg.sender;
	}

    modifier payloadMustExist(bytes32 IPFShash) {
        require(payloads[IPFShash].isValue, "payload must exist");
        _;
    }

    function storeAuthNPayload(bytes32 IPFShash, address target, address verifier) public {
        Payload storage p = payloads[IPFShash];
        p.target = target;
        p.verifier = verifier;
    }

    // check if given address is trusted gateway
    // check if given address is trusted device

    // TODO: delete trusted gateway, use below code
    // delete trustedGateways[address];

    function getValue(uint initial) public returns(uint) {
        return initial + 150;
    }

}