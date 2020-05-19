const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

contract('Revoking Device Test', (accounts) => {
  const gatewayAddress = accounts[1];
  const ISPAddress = accounts[2];
  const vendorAddress = accounts[3];
  const deviceUUID = accounts[4];
  const ownerAddress = accounts[6];
  const observerAddress = accounts[9];

  const gatewayPayloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231';
  const devicePayloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f200';
  const routerIP = web3.utils.fromAscii("200.100.10.10");
  let RC;

  beforeEach('deploy contract, store valid payloads, validate gateway', async () => {
    RC = await RegistryContract.new();
    await RC.storeAuthNPayload(gatewayPayloadHash, gatewayAddress, ISPAddress, {
      from: ownerAddress
    });
    await RC.verifyAuthNGateway(gatewayPayloadHash, routerIP, {
      from: ISPAddress
    });
    await RC.storeAuthNPayload(devicePayloadHash, deviceUUID, vendorAddress, {
      from: gatewayAddress
    });
  });

  it('GATEWAY can NOT revoke the DEVICE due to invalid PAYLOAD (not exist)', async () => {
    await RC.verifyAuthNDevice(devicePayloadHash, {
      from: vendorAddress
    });
    const fakeHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f000';
    await truffleAssert.reverts(
      RC.deleteTrustedDevice(fakeHash, deviceUUID, {
        from: gatewayAddress
      }), 'payload must exist'
    );
  });

  it('OBSERVER can NOT revoke the DEVICE due to invalid SOURCE (not authorized)', async () => {
    await RC.verifyAuthNDevice(devicePayloadHash, {
      from: vendorAddress
    });
    // an observer cannot arbitrarily revoke a device
    await truffleAssert.reverts(
      RC.deleteTrustedDevice(devicePayloadHash, deviceUUID, {
        from: observerAddress
      }), 'only for original source'
    );
  });

  it('GATEWAY can NOT revoke the DEVICE due to has not been verified yet', async () => {
    // the device has not been verified yet, therefore the device is not trusted
    await truffleAssert.reverts(
      RC.deleteTrustedDevice(devicePayloadHash, deviceUUID, {
        from: gatewayAddress
      }), 'device must be trusted'
    );
  });

  it('GATEWAY can revoke the DEVICE properly', async () => {
    await RC.verifyAuthNDevice(devicePayloadHash, {
      from: vendorAddress
    });

    let status = await RC.isTrustedDevice(deviceUUID, {
      from: observerAddress
    });
    assert.equal(status, true, "device address has been put into the trusted list");

    let tx = await RC.deleteTrustedDevice(devicePayloadHash, deviceUUID, {
      from: gatewayAddress
    });
    truffleAssert.eventEmitted(tx, 'DeviceRevoked', {
      sender: gatewayAddress,
      device: deviceUUID
    });

    status = await RC.isTrustedDevice(deviceUUID, {
      from: observerAddress
    });
    assert.equal(status, false, "device address has been revoked");
  });
});