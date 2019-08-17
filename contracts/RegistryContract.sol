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
    // key: device address, value: current list of gateway address
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

    modifier onlyForVerifier(bytes32 IPFSHash) {
        require(payloads[IPFSHash].verifier == msg.sender, "only for valid verifier");
        _;
    }

    modifier targetMustExist(bytes32 IPFSHash, address target) {
        require(payloads[IPFSHash].target == target, "must verify correct target");
        _;
    }

    modifier gatewayMustTrusted(address gateway) {
        require(trustedGateways[gateway] == true, "gateway must be trusted first");
        _;
    }

    function storeAuthNPayload(bytes32 IPFSHash, address target, address verifier) external
    payloadMustNotExist(IPFSHash) {
        Payload storage p = payloads[IPFSHash];
        p.target = target;
        p.verifier = verifier;
        p.isValue = true;

        emit NewPayloadAdded(msg.sender, IPFSHash);
    }

    function verifyAuthNGateway(bytes32 IPFSHash, address gateway) external
    payloadMustExist(IPFSHash)
    onlyForVerifier(IPFSHash)
    targetMustExist(IPFSHash, gateway) {
        trustedGateways[gateway] = true;

        emit GatewayVerified(msg.sender, gateway);
    }

    function verifyAuthNDevice(bytes32 IPFSHash, address gateway, address device) external
    payloadMustExist(IPFSHash)
    onlyForVerifier(IPFSHash)
    targetMustExist(IPFSHash, device)
    gatewayMustTrusted(gateway) {
        trustedDevices[device] = gateway;

        emit DeviceVerified(msg.sender, gateway, device);
    }

    function isValidPayloadForVerifier(bytes32 IPFSHash) external view
    returns (bool) {
        if (payloads[IPFSHash].isValue && payloads[IPFSHash].verifier == msg.sender) {
            return true;
        }
        return false;
    }

    function isTrustedGateway(address gateway) external view
    returns (bool) {
        return (trustedGateways[gateway] == true);
    }

    function isTrustedDevice(address device) external view
    returns (bool) {
        return (trustedGateways[trustedDevices[device]] == true);
    }

    // TODO: delete trusted gateway, use below code
    // delete trustedGateways[address];
}