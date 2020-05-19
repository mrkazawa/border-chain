const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

contract('Revoking Gateway Test', (accounts) => {
    const gatewayAddress = accounts[1]; // gateway address
    const ISPAddress = accounts[2]; // ISP verifier address
    const vendorAddress = accounts[3]; // vendor address
    const deviceUUID = accounts[4]; // device UUID, we assume to use Ethereum address
    const ownerAddress = accounts[6]; // domain owner address
    const observerAddress = accounts[9]; // anonymous node address

    const gatewayPayloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231';
    const devicePayloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f200';
    const routerIP = web3.utils.fromAscii("200.100.10.10");
    let RC;

    beforeEach('deploy contract and store a valid payload', async () => {
        RC = await RegistryContract.new();
        await RC.storeAuthNPayload(gatewayPayloadHash, gatewayAddress, ISPAddress, {
            from: ownerAddress
        });
    });

    it('DOMAIN OWNER can NOT revoke the GATEWAY due to invalid PAYLOAD (not exist)', async () => {
        await RC.verifyAuthNGateway(gatewayPayloadHash, routerIP, {
            from: ISPAddress
        });
        const fakeHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f000';
        await truffleAssert.reverts(
            RC.deleteTrustedGateway(fakeHash, gatewayAddress, {
                from: ownerAddress
            }), 'payload must exist'
        );
    });

    it('OBSERVER can NOT revoke the GATEWAY due to invalid SOURCE', async () => {
        await RC.verifyAuthNGateway(gatewayPayloadHash, routerIP, {
            from: ISPAddress
        });
        // an observer cannot arbitrarily revoke a gateway
        await truffleAssert.reverts(
            RC.deleteTrustedGateway(gatewayPayloadHash, gatewayAddress, {
                from: observerAddress
            }), 'only for original source'
        );
    });

    it('DOMAIN OWNER can NOT revoke the GATEWAY due to has not been verified yt', async () => {
        // the payload has not been verified yet, therefore the gateway is not trusted
        await truffleAssert.reverts(
            RC.deleteTrustedGateway(gatewayPayloadHash, gatewayAddress, {
                from: ownerAddress
            }), 'gateway must be trusted first'
        );
    });

    it('DOMAIN OWNER can revoke the GATEWAY properly', async () => {
        await RC.verifyAuthNGateway(gatewayPayloadHash, routerIP, {
            from: ISPAddress
        });
        await RC.storeAuthNPayload(devicePayloadHash, deviceUUID, vendorAddress, {
            from: gatewayAddress
        });
        await RC.verifyAuthNDevice(devicePayloadHash, {
            from: vendorAddress
        });

        let status = await RC.isTrustedGateway(gatewayAddress, {
            from: observerAddress
        });
        assert.equal(status, true, "gateway address has been put into the trusted list");
        status = await RC.isTrustedDevice(deviceUUID, {
            from: observerAddress
        });
        assert.equal(status, true, "device address has been put into the trusted list");

        let tx = await RC.deleteTrustedGateway(gatewayPayloadHash, gatewayAddress, {
            from: ownerAddress
        });
        truffleAssert.eventEmitted(tx, 'GatewayRevoked', {
            sender: ownerAddress,
            gateway: gatewayAddress
        });

        // when we delete the trusted gateway, any associated device connected to the gateway
        // should also be deleted, thereby not trusted
        status = await RC.isTrustedGateway(gatewayAddress, {
            from: observerAddress
        });
        assert.equal(status, false, "gateway address has been revokedt");
        status = await RC.isTrustedDevice(deviceUUID, {
            from: observerAddress
        });
        assert.equal(status, false, "device address is not trusted since the gateway is revoked");
    });

    // TODO: When we delete gateway, what happen to the exisiting authorization (token, keys, and so on)
});