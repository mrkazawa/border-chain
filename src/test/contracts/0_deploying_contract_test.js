const RegistryContract = artifacts.require("RegistryContract");

contract('Contract Deployment Test', function (accounts) {
  let RC;

  beforeEach('deploy contract', async function () {
    RC = await RegistryContract.new();
  });

  it('RC should deployed properly', async function () {
    let RCOwner = await RC.owner.call();
    assert.equal(RCOwner, accounts[0], "truffle assign the first account as contract deployer by default");
  });
});