const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

contract('Gateway Authentication -- Storing Payload Test', (accounts) => {
    const gatewayAddress = accounts[1]; // gateway address
    const ISPAddress = accounts[2]; // ISP verifier address
    const ownerAddress = accounts[6]; // domain owner address
    const observerAddress = accounts[9]; // anonymous node address

    const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231';
    let RC;

    beforeEach('deploy contract', async () => {
        RC = await RegistryContract.new();
    });

    it('DOMAIN OWNER can store the hash of the payload', async () => {
        let tx = await RC.storeAuthNPayload(payloadHash, gatewayAddress, ISPAddress, {
            from: ownerAddress
        });
        truffleAssert.eventEmitted(tx, 'NewPayloadAdded', {
            sender: ownerAddress,
            payloadHash: payloadHash
        });
    });

    it('DOMAIN OWNER can NOT store the same payload hash', async () => {
        await RC.storeAuthNPayload(payloadHash, gatewayAddress, ISPAddress, {
            from: ownerAddress
        });
        // mistakenly store the same authentication payload hash
        await truffleAssert.reverts(
            RC.storeAuthNPayload(payloadHash, observerAddress, ISPAddress, {
                from: ownerAddress
            }), 'payload must not exist'
        );
    });
});