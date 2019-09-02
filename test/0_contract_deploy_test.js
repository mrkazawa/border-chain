const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

contract('Contract Deployment Test', (accounts) => {
    const gatewayAddress = accounts[1]; // gateway address
    const ISPAddress = accounts[2]; // ISP verifier address
    const ownerAddress = accounts[6]; // domain owner address
    const observerAddress = accounts[9]; // anonymous node address

    const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231';
    let RC;

    beforeEach('deploy contract', async () => {
        RC = await RegistryContract.new();
    });

    it('RC should deployed properly', async () => {
        let RCOwner = await RC.owner.call();
        assert.equal(RCOwner, accounts[0], "truffle assign the first account as contract deployer by default");
    });
});