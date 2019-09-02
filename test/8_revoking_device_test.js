const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

contract('Revoking Device Test', (accounts) => {
  const gatewayAddress = accounts[1]; // gateway address
  const ISPAddress = accounts[2]; // ISP verifier address
  const vendorAddress = accounts[3]; // vendor address
  const deviceUUID = accounts[4]; // device UUID, we assume to use Ethereum address
  const ownerAddress = accounts[6]; // domain owner address
  const observerAddress = accounts[9]; // anonymous node address

  const gatewayPayloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231';
  const devicePayloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f200';
  let RC;

  beforeEach('deploy contract, store valid payloads, validate gateway', async () => {
    RC = await RegistryContract.new();
    await RC.storeAuthNPayload(gatewayPayloadHash, gatewayAddress, ISPAddress, { from: ownerAddress });
    await RC.verifyAuthNGateway(gatewayPayloadHash, { from: ISPAddress });
    await RC.storeAuthNPayload(devicePayloadHash, deviceUUID, vendorAddress, { from: gatewayAddress });
  });

  it('GATEWAY can NOT revoke the DEVICE due to invalid PAYLOAD (not exist)', async () => {
    await RC.verifyAuthNDevice(devicePayloadHash, { from: vendorAddress });
    const fakeHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f000';
    await truffleAssert.reverts(
      RC.deleteTrustedDevice(fakeHash, deviceUUID, { from: gatewayAddress }), 'payload must exist'
    );
  });

  it('OBSERVER can NOT revoke the DEVICE due to invalid SOURCE', async () => {
    await RC.verifyAuthNDevice(devicePayloadHash, { from: vendorAddress });
    // an observer cannot arbitrarily revoke a device
    await truffleAssert.reverts(
      RC.deleteTrustedDevice(devicePayloadHash, deviceUUID, { from: observerAddress }), 'only for original source'
    );
  });

  it('GATEWAY can NOT revoke the DEVICE due to has not been verified yet', async () => {
    // the device has not been verified yet, therefore the device is not trusted
    await truffleAssert.reverts(
      RC.deleteTrustedDevice(devicePayloadHash, deviceUUID, { from: gatewayAddress }), 'device must be trusted first'
    );
  });

  it('GATEWAY can revoke the DEVICE properly', async () => {
    await RC.verifyAuthNDevice(devicePayloadHash, { from: vendorAddress });
    
    let status = await RC.isTrustedDevice(deviceUUID, { from: observerAddress });
    assert.equal(status, true, "device address has been put into the trusted list");

    let tx = await RC.deleteTrustedDevice(devicePayloadHash, deviceUUID, { from: gatewayAddress });
    truffleAssert.eventEmitted(tx, 'DeviceRevoked', { sender: gatewayAddress, device: deviceUUID });

    status = await RC.isTrustedDevice(deviceUUID, { from: observerAddress });
    assert.equal(status, false, "device address has been revoked");
  });

  // TODO: When we delete gateway, what happen to the exisiting authorization (token, keys, and so on)
});