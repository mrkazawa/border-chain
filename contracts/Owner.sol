pragma solidity >=0.4.25 <0.6.0;

contract Owner {
    address public owner;

    constructor() public {
		owner = msg.sender;
	}

    modifier restricted() {
        if (msg.sender == owner) _;
    }

    function someAction(address addr) public returns(uint) {
        Broker c = Broker(addr);
        return c.getValue(100);
    }

    /*
    function beginAuthGateway(uint IPFS_hash, address rooster_address, address ISP_AS_address) public returns(uint) {
        Broker c = Broker(rooster_address);
        return c.authNGateway(IPFS_hash, ISP_AS_address);
    }*/
}

interface Broker {
    function getValue(uint initialValue) external returns(uint);
    //function authNGateway(uint IPFS_hash, address ISP_AS_address) external returns(uint) {
}