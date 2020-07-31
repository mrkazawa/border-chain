// SPDX-License-Identifier: MIT
pragma solidity >=0.5.1;

contract RegistryContract {
    // TODO: add isRevoked, and add test case also
    struct AuthenticationPayload {
        address source; // the sender of the authentication payload
        address target; // the authentication target
        address verifier; // the verifier of the target
        bool isValue; // true when payload is stored
        bool isVerified; // true when it has been verified by verifier
        bool isRevoked; // true when it has been revoked by the original proposer
    }

    address public owner;

    mapping(bytes32 => AuthenticationPayload) public payloads; // key: payloadHash, value: AuthenticationPayload struct
    mapping(address => bytes32) trustedGateways; // key: gateway address, value: reachable IP if trusted (not trusted will be 0x0)
    mapping(address => address) trustedDevices; // key: device address, value: current gateway address

    //----------------------------- Events -----------------------------//

    event NewPayloadAdded(
        address sender,
        bytes32 payloadHash,
        address target,
        address verifier
    );
    event GatewayVerified(address sender, bytes32 payloadHash, address gateway);
    event DeviceVerified(
        address sender,
        bytes32 payloadHash,
        address gateway,
        address device
    );
    event GatewayRevoked(address sender, address gateway);
    event DeviceRevoked(address sender, address device);

    //----------------------------- Modifiers -----------------------------//

    modifier payloadMustExist(bytes32 payloadHash) {
        require(payloads[payloadHash].isValue, "payload must exist");
        _;
    }

    modifier payloadMustNotExist(bytes32 payloadHash) {
        require(!payloads[payloadHash].isValue, "payload must not exist");
        _;
    }

    modifier payloadMustNotVerified(bytes32 payloadHash) {
        require(
            !payloads[payloadHash].isVerified,
            "payload must be not verified"
        );
        _;
    }

    modifier onlyForVerifier(bytes32 payloadHash) {
        require(
            payloads[payloadHash].verifier == msg.sender,
            "only for valid verifier"
        );
        _;
    }

    modifier onlyForSource(bytes32 payloadHash) {
        require(
            payloads[payloadHash].source == msg.sender,
            "only for original source"
        );
        _;
    }

    modifier gatewayMustTrusted(address gateway) {
        require(trustedGateways[gateway] != 0, "gateway must be trusted");
        _;
    }

    modifier deviceMustTrusted(address device) {
        require(
            trustedGateways[trustedDevices[device]] != 0,
            "device must be trusted"
        );
        _;
    }

    //----------------------------- Methods -----------------------------//

    constructor() public {
        owner = msg.sender;
    }

    function storeAuthNPayload(
        bytes32 payloadHash,
        address target,
        address verifier
    ) public payloadMustNotExist(payloadHash) {
        AuthenticationPayload storage p = payloads[payloadHash];
        p.source = msg.sender;
        p.target = target;
        p.verifier = verifier;
        p.isValue = true;

        emit NewPayloadAdded(msg.sender, payloadHash, target, verifier);
    }

    function verifyAuthNGateway(bytes32 payloadHash, bytes32 routerIP)
        public
        payloadMustExist(payloadHash)
        payloadMustNotVerified(payloadHash)
        onlyForVerifier(payloadHash)
    {
        trustedGateways[payloads[payloadHash].target] = routerIP;
        payloads[payloadHash].isVerified = true;

        emit GatewayVerified(
            msg.sender,
            payloadHash,
            payloads[payloadHash].target
        );
    }

    function verifyAuthNDevice(bytes32 payloadHash)
        public
        payloadMustExist(payloadHash)
        payloadMustNotVerified(payloadHash)
        onlyForVerifier(payloadHash)
        gatewayMustTrusted(payloads[payloadHash].source)
    {
        trustedDevices[payloads[payloadHash].target] = payloads[payloadHash]
            .source;
        payloads[payloadHash].isVerified = true;

        emit DeviceVerified(
            msg.sender,
            payloadHash,
            payloads[payloadHash].source,
            payloads[payloadHash].target
        );
    }

    function deleteTrustedGateway(bytes32 payloadHash, address gateway)
        public
        payloadMustExist(payloadHash)
        onlyForSource(payloadHash)
        gatewayMustTrusted(gateway)
    {
        trustedGateways[gateway] = 0;

        emit GatewayRevoked(msg.sender, gateway);
    }

    function deleteTrustedDevice(bytes32 payloadHash, address device)
        public
        payloadMustExist(payloadHash)
        onlyForSource(payloadHash)
        deviceMustTrusted(device)
    {
        trustedDevices[device] = address(0);

        emit DeviceRevoked(msg.sender, device);
    }

    function isTrustedGateway(address gateway) public view returns (bool) {
        return (trustedGateways[gateway] != 0);
    }

    function isTrustedDevice(address device) public view returns (bool) {
        return (trustedGateways[trustedDevices[device]] != 0);
    }

    function getGatewayIP(address gateway) public view returns (bytes32) {
        return trustedGateways[gateway];
    }
}
