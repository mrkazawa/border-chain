const RegistryContract = artifacts.require("RegistryContract");

contract('Contract Deployment Test', (accounts) => {
  let RC;

  beforeEach('deploy contract', async () => {
    RC = await RegistryContract.new();
  });

  it('RC should deployed properly', async () => {
    let RCOwner = await RC.owner.call();
    assert.equal(RCOwner, accounts[0], "truffle assign the first account as contract deployer by default");
  });
});