pragma solidity >=0.4.25 <0.6.0;

contract RegistryContract {
    struct Payload {
		address target;
		address verifier;
        bool isValue;
	}

    address public owner;
    // key: IPFS hash, value: Payload struct
    mapping (bytes32 => Payload) payloads;
    // key: gateway address, value: true if trusted
    mapping (address => bool) trustedGateways;
    // key: device address, value: current gateway address
    mapping (address => address) trustedDevices;

    event NewPayloadAdded(address sender, bytes32 IPFSHash);
    event GatewayVerified(address sender, address gateway);
    event DeviceVerified(address sender, address gateway, address device);

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

    modifier verifierAndTargetMustExist(bytes32 IPFSHash, address target) {
        require(payloads[IPFSHash].verifier == msg.sender, "only for valid verifier");
        require(payloads[IPFSHash].target == target, "must verify correct target");
        _;
    }

    modifier gatewayMustTrusted(address gateway) {
        require(trustedGateways[gateway] == true, "gateway must be trusted first");
        _;
    }

    function storeAuthNPayload(bytes32 IPFSHash, address target, address verifier) public
    payloadMustNotExist(IPFSHash) {
        Payload storage p = payloads[IPFSHash];
        p.target = target;
        p.verifier = verifier;
        p.isValue = true;

        emit NewPayloadAdded(msg.sender, IPFSHash);
    }

    function verifyAuthNGateway(bytes32 IPFSHash, address gateway) public
    payloadMustExist(IPFSHash)
    verifierAndTargetMustExist(IPFSHash, gateway) {
        trustedGateways[gateway] = true;

        emit GatewayVerified(msg.sender, gateway);
    }

    function verifyAuthNDevice(bytes32 IPFSHash, address gateway, address device) public
    payloadMustExist(IPFSHash)
    verifierAndTargetMustExist(IPFSHash, device)
    gatewayMustTrusted(gateway) {
        trustedDevices[device] = gateway;

        emit DeviceVerified(msg.sender, gateway, device);
    }

    function isTrustedGateway(address gateway) public view
    returns (bool) {
        return (trustedGateways[gateway] == true);
    }

    function isTrustedDevice(address device) public view
    returns (bool) {
        return (trustedGateways[trustedDevices[device]] == true);
    }

    // TODO: delete trusted gateway, use below code
    // delete trustedGateways[address];
}