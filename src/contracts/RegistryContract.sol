// SPDX-License-Identifier: MIT
pragma solidity >=0.5.1;

contract RegistryContract {
    //----------------------------- Variables -----------------------------//

    struct Payload {
        address source; // the sender of this payload
        address target; // the target of this payload
        address approver; // the approver of this payload
        bool isValue; // true when payload is stored
        bool isApproved; // true when it has been approved
        bool isRevoked; // true when it has been revoked
        uint256 expiryTime; // estimation on the expiry time using block.timestmap
    }

    address public owner;

    mapping(bytes32 => Payload) public payloads; // key: payloadHash, value: Payload struct
    mapping(address => bytes32) trustedGateways; // key: gateway address, value: reachable IP if trusted (not trusted will be 0x0)
    mapping(address => address) trustedDevices; // key: device address, value: current gateway address

    //----------------------------- Events -----------------------------//

    event PayloadAdded(
        bytes32 payloadHash,
        address sender,
        address target,
        address approver
    );
    event GatewayApproved(bytes32 payloadHash, address sender, address gateway);
    event DeviceApproved(
        bytes32 payloadHash,
        address sender,
        address gateway,
        address device
    );
    event AccessApproved(
        bytes32 payloadHash,
        address sender,
        address target,
        uint256 expiryTime
    );
    event GatewayRevoked(bytes32 payloadHash, address sender, address gateway);
    event DeviceRevoked(bytes32 payloadHash, address sender, address device);
    event AccessRevoked(bytes32 payloadHash, address sender, address target);

    //----------------------------- Modifiers -----------------------------//

    modifier payloadMustExist(bytes32 payloadHash) {
        require(payloads[payloadHash].isValue, "payload must exist");
        _;
    }

    modifier payloadMustNotExist(bytes32 payloadHash) {
        require(!payloads[payloadHash].isValue, "payload must not exist");
        _;
    }

    modifier payloadMustBeApproved(bytes32 payloadHash) {
        require(payloads[payloadHash].isApproved, "payload must be approved");
        _;
    }

    modifier payloadMustBeNotApproved(bytes32 payloadHash) {
        require(
            !payloads[payloadHash].isApproved,
            "payload must be not approved"
        );
        _;
    }

    modifier payloadMustBeNotRevoked(bytes32 payloadHash) {
        require(
            !payloads[payloadHash].isRevoked,
            "payload must be not revoked"
        );
        _;
    }

    modifier payloadIsForValidTarget(bytes32 payloadHash, address target) {
        require(
            payloads[payloadHash].target == target,
            "payload must contain a valid target"
        );
        _;
    }

    modifier onlyForApprover(bytes32 payloadHash) {
        require(
            payloads[payloadHash].approver == msg.sender,
            "only for original approver"
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

    modifier onlyForSourceOrApprover(bytes32 payloadHash) {
        require(
            payloads[payloadHash].source == msg.sender ||
                payloads[payloadHash].approver == msg.sender,
            "only for original source or approver"
        );
        _;
    }

    modifier gatewayMustBeTrusted(address gateway) {
        require(trustedGateways[gateway] != 0, "gateway must be trusted");
        _;
    }

    //----------------------------- Methods -----------------------------//

    constructor() public {
        owner = msg.sender;
    }

    function storePayload(
        bytes32 payloadHash,
        address target,
        address approver
    ) public payloadMustNotExist(payloadHash) {
        Payload storage p = payloads[payloadHash];
        p.source = msg.sender;
        p.target = target;
        p.approver = approver;
        p.isValue = true;

        emit PayloadAdded(payloadHash, msg.sender, target, approver);
    }

    function approveGateway(bytes32 payloadHash, bytes32 routerIp)
        public
        payloadMustExist(payloadHash)
        payloadMustBeNotApproved(payloadHash)
        onlyForApprover(payloadHash)
    {
        trustedGateways[payloads[payloadHash].target] = routerIp;
        payloads[payloadHash].isApproved = true;

        emit GatewayApproved(
            payloadHash,
            msg.sender,
            payloads[payloadHash].target
        );
    }

    function approveDevice(bytes32 payloadHash)
        public
        payloadMustExist(payloadHash)
        payloadMustBeNotApproved(payloadHash)
        onlyForApprover(payloadHash)
        gatewayMustBeTrusted(payloads[payloadHash].source)
    {
        trustedDevices[payloads[payloadHash].target] = payloads[payloadHash]
            .source;
        payloads[payloadHash].isApproved = true;

        emit DeviceApproved(
            payloadHash,
            msg.sender,
            payloads[payloadHash].source,
            payloads[payloadHash].target
        );
    }

    function approveAccess(bytes32 payloadHash, uint256 expiredIn)
        public
        payloadMustExist(payloadHash)
        payloadMustBeNotApproved(payloadHash)
        onlyForApprover(payloadHash)
        gatewayMustBeTrusted(payloads[payloadHash].approver)
    {
        payloads[payloadHash].expiryTime = block.timestamp + expiredIn;
        payloads[payloadHash].isApproved = true;

        emit AccessApproved(
            payloadHash,
            msg.sender,
            payloads[payloadHash].source,
            payloads[payloadHash].expiryTime
        );
    }

    function revokeGateway(bytes32 payloadHash, address gateway)
        public
        payloadMustExist(payloadHash)
        payloadMustBeApproved(payloadHash)
        payloadMustBeNotRevoked(payloadHash)
        onlyForSource(payloadHash)
        payloadIsForValidTarget(payloadHash, gateway)
    {
        trustedGateways[gateway] = 0;
        payloads[payloadHash].isRevoked = true;

        emit GatewayRevoked(payloadHash, msg.sender, gateway);
    }

    function revokeDevice(bytes32 payloadHash, address device)
        public
        payloadMustExist(payloadHash)
        payloadMustBeApproved(payloadHash)
        payloadMustBeNotRevoked(payloadHash)
        onlyForSource(payloadHash)
        payloadIsForValidTarget(payloadHash, device)
    {
        trustedDevices[device] = address(0);
        payloads[payloadHash].isRevoked = true;

        emit DeviceRevoked(payloadHash, msg.sender, device);
    }

    function revokeAccess(bytes32 payloadHash)
        public
        payloadMustExist(payloadHash)
        payloadMustBeApproved(payloadHash)
        payloadMustBeNotRevoked(payloadHash)
        onlyForSourceOrApprover(payloadHash)
    {
        payloads[payloadHash].isRevoked = true;

        emit AccessRevoked(
            payloadHash,
            msg.sender,
            payloads[payloadHash].target
        );
    }

    function isTrustedGateway(address gateway) public view returns (bool) {
        return (trustedGateways[gateway] != 0);
    }

    function isTrustedDevice(address device) public view returns (bool) {
        return (trustedGateways[trustedDevices[device]] != 0);
    }

    function isValidAccess(bytes32 payloadHash)
        public
        view
        payloadMustExist(payloadHash)
        returns (bool)
    {
        if (payloads[payloadHash].isApproved == false) return false;
        else if (payloads[payloadHash].isRevoked == true) return false;
        else if (payloads[payloadHash].expiryTime < block.timestamp)
            return false;
        else return true;
    }
}
