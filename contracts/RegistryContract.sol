pragma solidity >=0.4.25 <0.6.0;

contract RegistryContract {
    struct AuthenticationPayload {
        address source; // the sender of the authentication payload
		address target; // the authentication target
		address verifier; // the verifier of the target
        bool isValue; // true when payload is stored
        bool isVerified; // true when it has been verified by verifier
	}

    address public owner;
    // key: payloadHash, value: Payload struct
    mapping (bytes32 => AuthenticationPayload) public payloads;
    // key: gateway address, value: reachable IP if trusted (not trusted will be 0x0)
    mapping (address => bytes32) trustedGateways;
    // key: device address, value: current list of gateway address
    mapping (address => address) trustedDevices;

    event NewPayloadAdded(address sender, bytes32 payloadHash);
    event GatewayVerified(address sender, address gateway);
    event DeviceVerified(address sender, address gateway, address device);
    event GatewayRevoked(address sender, address gateway);
    event DeviceRevoked(address sender, address device);

    modifier payloadMustExist(bytes32 payloadHash) {
        require(payloads[payloadHash].isValue, "payload must exist");
        _;
    }

    modifier payloadMustNotExist(bytes32 payloadHash) {
        require(!payloads[payloadHash].isValue, "payload must not exist");
        _;
    }

    modifier payloadMustNotVerified(bytes32 payloadHash) {
        require(!payloads[payloadHash].isVerified, "payload must not verified");
        _;
    }

    modifier onlyForVerifier(bytes32 payloadHash) {
        require(payloads[payloadHash].verifier == msg.sender, "only for valid verifier");
        _;
    }

    modifier gatewayMustTrusted(address gateway) {
        require(trustedGateways[gateway] != 0, "gateway must be trusted first");
        _;
    }

    modifier deviceMustTrusted(address device) {
        require(trustedGateways[trustedDevices[device]] != 0, "device must be trusted first");
        _;
    }

    modifier onlyForSource(bytes32 payloadHash) {
        require(payloads[payloadHash].source == msg.sender, "only for original source");
        _;
    }

    constructor() public {
		owner = msg.sender;
	}

    function storeAuthNPayload(bytes32 payloadHash, address target, address verifier) public
    payloadMustNotExist(payloadHash) {
        AuthenticationPayload storage p = payloads[payloadHash];
        p.source = msg.sender;
        p.target = target;
        p.verifier = verifier;
        p.isValue = true;
        p.isVerified = false;

        emit NewPayloadAdded(msg.sender, payloadHash);
    }

    function verifyAuthNGateway(bytes32 payloadHash, bytes32 routerIP) public
    payloadMustExist(payloadHash)
    payloadMustNotVerified(payloadHash)
    onlyForVerifier(payloadHash) {
        trustedGateways[payloads[payloadHash].target] = routerIP;
        payloads[payloadHash].isVerified = true;

        emit GatewayVerified(msg.sender, payloads[payloadHash].target);
    }

    function verifyAuthNDevice(bytes32 payloadHash) public
    payloadMustExist(payloadHash)
    payloadMustNotVerified(payloadHash)
    onlyForVerifier(payloadHash)
    gatewayMustTrusted(payloads[payloadHash].source) {
        trustedDevices[payloads[payloadHash].target] = payloads[payloadHash].source;
        payloads[payloadHash].isVerified = true;

        emit DeviceVerified(msg.sender, payloads[payloadHash].source, payloads[payloadHash].target);
    }

    function deleteTrustedGateway(bytes32 payloadHash, address gateway) public
    payloadMustExist(payloadHash)
    onlyForSource(payloadHash)
    gatewayMustTrusted(gateway) {
        trustedGateways[gateway] = 0;

        emit GatewayRevoked(msg.sender, gateway);
    }

    function deleteTrustedDevice(bytes32 payloadHash, address device) public
    payloadMustExist(payloadHash)
    onlyForSource(payloadHash)
    deviceMustTrusted(device) {
       trustedDevices[device] = address(0);

       emit DeviceRevoked(msg.sender, device);
    }

    function isTrustedGateway(address gateway) public view
    returns (bool) {
        return (trustedGateways[gateway] != 0);
    }

    function isTrustedDevice(address device) public view
    returns (bool) {
        return (trustedGateways[trustedDevices[device]] != 0);
    }

    function getPayloadDetail(bytes32 payloadHash) public view
    returns (address, address, address, bool, bool) {
        return (payloads[payloadHash].source,
        payloads[payloadHash].target,
        payloads[payloadHash].verifier,
        payloads[payloadHash].isValue,
        payloads[payloadHash].isVerified);
    }

    function getGatewayIP(address gateway) public view
    returns (bytes32) {
        return trustedGateways[gateway];
    }
}