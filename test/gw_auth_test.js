const Broker = artifacts.require("Broker");
const Owner = artifacts.require("Owner");

var brokerAddress;

contract('Broker', (accounts) => {
    it('should deployed properly', async () => {
      const brokerInstance = await Broker.deployed();
      brokerAddress = await brokerInstance.address;
      const brokerOwner = await brokerInstance.owner.call();

      assert.isNotEmpty(brokerAddress, "we get the contract address");
      assert.equal(brokerOwner, accounts[0], "truffle assign the first account as deployer by default");
    });
});
