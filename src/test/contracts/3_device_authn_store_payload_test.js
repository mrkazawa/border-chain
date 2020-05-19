const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

contract('Device Authentication -- Storing Payload Test', (accounts) => {
  const gatewayAddress = accounts[1];
  const vendorAddress = accounts[3];
  const deviceUUID = accounts[4];
  const observerAddress = accounts[9];

  const devicePayloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f200';
  let RC;

  beforeEach('deploy contract', async () => {
    RC = await RegistryContract.new();
  });

  it('GATEWAY can store the hash of the payload', async () => {
    let tx = await RC.storeAuthNPayload(devicePayloadHash, deviceUUID, vendorAddress, {
      from: gatewayAddress
    });
    truffleAssert.eventEmitted(tx, 'NewPayloadAdded', {
      sender: gatewayAddress,
      payloadHash: devicePayloadHash
    });
  });

  it('GATEWAY can NOT store the same payload hash', async () => {
    await RC.storeAuthNPayload(devicePayloadHash, deviceUUID, vendorAddress, {
      from: gatewayAddress
    });
    // mistakenly store the same authentication payload hash
    await truffleAssert.reverts(
      RC.storeAuthNPayload(devicePayloadHash, observerAddress, vendorAddress, {
        from: gatewayAddress
      }), 'payload must not exist'
    );
  });
});