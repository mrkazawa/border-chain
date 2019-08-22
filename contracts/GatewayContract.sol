pragma solidity >=0.4.25 <0.6.0;

contract GatewayContract {
    struct Authorization {
        address device;
		address requester;
        bool isValue;
	}

    address public owner;
    // key: hash of token, value: authorization detail
    mapping (bytes32 => Authorization) trustedTokens;

    event NewAuthorizationRequest(address sender, address device);
    event NewAuthorizationApproved(address sender, address device, address requester);

    modifier onlyOwner() {
        require(msg.sender == owner, 'only for GatewayContract owner');
        _;
    }

    constructor() public {
		owner = msg.sender;
	}

    function requestAuthorization(address device) public {
        emit NewAuthorizationRequest(msg.sender, device);
    }

    function approveAuthorization(bytes32 token, address device, address requester) public
    onlyOwner() {
        Authorization storage a = trustedTokens[token];
        a.device = device;
        a.requester = requester;
        a.isValue = true;

        //emit NewPayloadAdded(msg.sender, IPFSHash);
    }
}