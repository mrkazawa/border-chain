const RC = artifacts.require("RegistryContract");

const ipfsTools = require('./ipfs_tools');

contract('RegistryContract', (accounts) => {
  it('should deployed properly', async () => {
    const RCInstance = await RC.deployed();
    const RCOwner = await RCInstance.owner.call();

    assert.equal(RCOwner, accounts[0], "truffle assign the first account as contract deployer by default");
  });

  it('should store the hash of the payload properly', async () => {
    const RCInstance = await RC.deployed();
    console.log()
  });
});