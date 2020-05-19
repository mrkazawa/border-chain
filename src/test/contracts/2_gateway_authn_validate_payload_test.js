const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

contract('Gateway Authentication -- Validating Payload Test', (accounts) => {
  const gatewayAddress = accounts[1];
  const ISPAddress = accounts[2];
  const ownerAddress = accounts[6];
  const observerAddress = accounts[9];

  const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231';
  const routerIP = web3.utils.fromAscii("200.100.10.10");
  let RC;

  beforeEach('deploy contract and store a valid payload', async () => {
    RC = await RegistryContract.new();
    await RC.storeAuthNPayload(payloadHash, gatewayAddress, ISPAddress, {
      from: ownerAddress
    });
  });

  it('ISP can NOT verify the GATEWAY due to invalid PAYLOAD (not exist)', async () => {
    const fakeHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f000';
    await truffleAssert.reverts(
      RC.verifyAuthNGateway(fakeHash, routerIP, {
        from: ISPAddress
      }), 'payload must exist'
    );
  });

  it('ISP can NOT verify the GATEWAY due to invalid PAYLOAD (already verified)', async () => {
    await RC.verifyAuthNGateway(payloadHash, routerIP, {
      from: ISPAddress
    });
    // double verifing is not allowed
    await truffleAssert.reverts(
      RC.verifyAuthNGateway(payloadHash, routerIP, {
        from: ISPAddress
      }), 'payload must be not verified'
    );
  });

  it('OBSERVER can NOT verify the GATEWAY due to invalid VERIFIER (not authorized)', async () => {
    // an observer cannot arbitrarily verify a payload
    await truffleAssert.reverts(
      RC.verifyAuthNGateway(payloadHash, routerIP, {
        from: observerAddress
      }), 'only for valid verifier'
    );
  });

  it('ISP can verify the GATEWAY correctly', async () => {
    let status = await RC.isTrustedGateway(gatewayAddress, {
      from: observerAddress
    });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    let tx = await RC.verifyAuthNGateway(payloadHash, routerIP, {
      from: ISPAddress
    });
    truffleAssert.eventEmitted(tx, 'GatewayVerified', {
      sender: ISPAddress,
      gateway: gatewayAddress
    });

    status = await RC.isTrustedGateway(gatewayAddress, {
      from: observerAddress
    });
    assert.equal(status, true, "gateway address has been put into the trusted list");
  });
});