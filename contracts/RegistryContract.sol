pragma solidity >=0.4.25 <0.6.0;

contract RegistryContract {
    struct Payload {
        address source;
		address target;
		address verifier;
        bool isValue;
        bool isVerified;
	}

    address public owner;
    // key: IPFS hash, value: Payload struct
    mapping (bytes32 => Payload) public payloads;
    // key: gateway address, value: true if trusted
    mapping (address => bool) trustedGateways;
    // key: device address, value: current list of gateway address
    mapping (address => address) trustedDevices;

    event NewPayloadAdded(address sender, bytes32 IPFSHash);
    event GatewayVerified(address sender, address gateway);
    event DeviceVerified(address sender, address gateway, address device);
    event GatewayRevoked(address sender, address gateway);
    event DeviceRevoked(address sender, address device);

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

    modifier payloadMustNotVerified(bytes32 IPFSHash) {
        require(!payloads[IPFSHash].isVerified, "payload must not verified");
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

    modifier deviceMustTrusted(address device) {
        require(trustedGateways[trustedDevices[device]] == true, "device must be trusted first");
        _;
    }

    modifier onlyForSource(bytes32 IPFSHash) {
        require(payloads[IPFSHash].source == msg.sender, "only for original source");
        _;
    }

    function storeAuthNPayload(bytes32 IPFSHash, address target, address verifier) public
    payloadMustNotExist(IPFSHash) {
        Payload storage p = payloads[IPFSHash];
        p.source = msg.sender;
        p.target = target;
        p.verifier = verifier;
        p.isValue = true;

        emit NewPayloadAdded(msg.sender, IPFSHash);
    }

    function verifyAuthNGateway(bytes32 IPFSHash, address gateway) public
    payloadMustExist(IPFSHash)
    payloadMustNotVerified(IPFSHash)
    onlyForVerifier(IPFSHash)
    targetMustExist(IPFSHash, gateway) {
        trustedGateways[gateway] = true;
        payloads[IPFSHash].isVerified = true;

        emit GatewayVerified(msg.sender, gateway);
    }

    function verifyAuthNDevice(bytes32 IPFSHash, address gateway, address device) public
    payloadMustExist(IPFSHash)
    payloadMustNotVerified(IPFSHash)
    onlyForVerifier(IPFSHash)
    targetMustExist(IPFSHash, device)
    gatewayMustTrusted(gateway) {
        trustedDevices[device] = gateway;
        payloads[IPFSHash].isVerified = true;

        emit DeviceVerified(msg.sender, gateway, device);
    }

    function deleteTrustedGateway(bytes32 IPFSHash, address gateway) public
    payloadMustExist(IPFSHash)
    onlyForSource(IPFSHash)
    gatewayMustTrusted(gateway) {
        trustedGateways[gateway] = false;

        emit GatewayRevoked(msg.sender, gateway);
    }

    function deleteTrustedDevice(bytes32 IPFSHash, address device) public
    payloadMustExist(IPFSHash)
    onlyForSource(IPFSHash)
    deviceMustTrusted(device) {
       trustedDevices[device] = address(0);

       emit DeviceRevoked(msg.sender, device);
    }

    function isValidPayloadForVerifier(bytes32 IPFSHash) external view
    returns (bool) {
        if (payloads[IPFSHash].isValue &&
        payloads[IPFSHash].verifier == msg.sender &&
        payloads[IPFSHash].isVerified == false) {
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

    // get the verifier of given gateway
    // get the requester of given gateway
    // get the verifier of given device
    // get the requester of given device
}