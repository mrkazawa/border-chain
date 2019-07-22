pragma solidity >=0.4.25 <0.6.0;

contract Owner {
    function someAction(address addr) public returns(uint) {
        Broker c = Broker(addr);
        return c.getValue(100);
    }
    
    function storeAction(address addr) public returns(uint) {
        Broker c = Broker(addr);
        c.storeValue(100);
        return c.getValues();
    }
}

contract Broker {
    function getValue(uint initialValue) public returns(uint);
    function storeValue(uint value) public;
    function getValues() public returns(uint);
}