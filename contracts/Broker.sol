pragma solidity >=0.4.25 <0.6.0;

contract Broker {
    address public owner;
    uint[] public values;

    constructor() public {
		owner = msg.sender;
	}

    modifier restricted() {
        if (msg.sender == owner) _;
    }

    function getOwner() public view returns(address) {
		return owner;
	}

    function getValue(uint initial) public returns(uint) {
        return initial + 150;
    }
    function storeValue(uint value) public {
        values.push(value);
    }
    function getValues() public returns(uint) {
        return values.length;
    }
}