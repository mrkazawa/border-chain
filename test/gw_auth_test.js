const NC = artifacts.require("Network");
const Broker = artifacts.require("Broker");
const Owner = artifacts.require("Owner");

var brokerAddress;
var NCAddress;

contract('Broker', (accounts) => {
  it('should deployed properly', async () => {
    const brokerInstance = await Broker.deployed();
    brokerAddress = await brokerInstance.address;
    const brokerOwner = await brokerInstance.owner.call();

    assert.isNotEmpty(brokerAddress, "we get the contract address");
    assert.equal(brokerOwner, accounts[0], "truffle assign the first account as deployer by default");
  });
});

contract('Network', (accounts) => {
  it('should deployed properly', async () => {
    const NCInstance = await NC.deployed();
    NCAddress = await NCInstance.address;
    const NCOwner = await NCInstance.owner.call();

    assert.isNotEmpty(NCAddress, "we get the contract address");
    assert.equal(NCOwner, accounts[0], "truffle assign the first account as deployer by default");
  });
});

contract('Owner', (accounts) => {
  it('should deployed properly', async () => {
    const ownerInstance = await Owner.deployed();
    const owner = await ownerInstance.owner.call();

    assert.equal(owner, accounts[0], "truffle assign the first account as deployer by default");
  });

  it('should return correct value after invoke', async () => {
    const ownerInstance = await Owner.deployed();
    const value = await ownerInstance.someAction.call(brokerAddress, {
      from: accounts[0]
    });

    assert.equal(value, 250, "should return correct value 100+150");
  });
});