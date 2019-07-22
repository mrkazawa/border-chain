pragma solidity >=0.4.25 <0.6.0;

contract Broker {
    address public owner;

    constructor() public {
		owner = msg.sender;
	}

    /*
    function authNGateway(uint IPFS_hash, address ISP_AS_address) public returns(uint) {
        Network n = Network(ISP_AS_address);
        return n.doAuthN(IPFS_hash);
    }*/

    function getValue(uint initial) public returns(uint) {
        return initial + 150;
    }

}

/*
interface Network {
    function doAuthN(uint IPFS_hash) external returns(uint) {
}*/