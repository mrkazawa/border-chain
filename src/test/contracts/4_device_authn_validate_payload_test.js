const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

contract('Device Authentication -- Validating Payload Test', (accounts) => {
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

  beforeEach('deploy contract and store a valid payload for gateway and device', async () => {
    RC = await RegistryContract.new();
    await RC.storeAuthNPayload(gatewayPayloadHash, gatewayAddress, ISPAddress, {
      from: ownerAddress
    });
    await RC.storeAuthNPayload(devicePayloadHash, deviceUUID, vendorAddress, {
      from: gatewayAddress
    });
  });

  it('VENDOR can NOT verify the DEVICE due to invalid HASH (not exist)', async () => {
    await RC.verifyAuthNGateway(gatewayPayloadHash, routerIP, {
      from: ISPAddress
    });
    const fakeHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f000';
    await truffleAssert.reverts(
      RC.verifyAuthNDevice(fakeHash, {
        from: vendorAddress
      }), 'payload must exist'
    );
  });

  it('OBSERVER can NOT verify the DEVICE due to invalid VERIFIER (not authorized)', async () => {
    await RC.verifyAuthNGateway(gatewayPayloadHash, routerIP, {
      from: ISPAddress
    });
    // an observer cannot arbitrarily verify a payload
    await truffleAssert.reverts(
      RC.verifyAuthNDevice(devicePayloadHash, {
        from: observerAddress
      }), 'only for valid verifier'
    );
  });

  it('VENDOR can NOT verify the DEVICE due to invalid GATEWAY (not trusted GW)', async () => {
    // the gateway has not been validated yet, thereby it cannot validate a device
    await truffleAssert.reverts(
      RC.verifyAuthNDevice(devicePayloadHash, {
        from: vendorAddress
      }), 'gateway must be trusted'
    );
  });

  it('VENDOR can verify the DEVICE correctly', async () => {
    await RC.verifyAuthNGateway(gatewayPayloadHash, routerIP, {
      from: ISPAddress
    });

    let status = await RC.isTrustedDevice(deviceUUID, {
      from: observerAddress
    });
    assert.equal(status, false, "device address is NOT in the trusted list");

    let tx = await RC.verifyAuthNDevice(devicePayloadHash, {
      from: vendorAddress
    });
    truffleAssert.eventEmitted(tx, 'DeviceVerified', {
      sender: vendorAddress,
      gateway: gatewayAddress,
      device: deviceUUID
    });

    status = await RC.isTrustedDevice(deviceUUID, {
      from: observerAddress
    });
    assert.equal(status, true, "device address has been put into the trusted list");
  });
});