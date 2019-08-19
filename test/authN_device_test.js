const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');
const ipfsTools = require('./ipfs_tools');

const gatewayHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTGATEWAY';
const deviceHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTidevice';

contract('Device Authentication Test Scenarios', (accounts) => {
  const owner = accounts[0]; // owner of RC contract
  const GC = accounts[1]; // gateway contract address
  const ISP = accounts[2]; // ISP verifier address
  const vendor = accounts[3]; // Vendor verifier address
  const device = accounts[4]; // IoT device address
  const domainOwner = accounts[6]; // domain owner address
  const observer = accounts[9]; // anonymous node address

  let RC;
  let gatewayHashInBytes = ipfsTools.getBytes32FromIpfsHash(gatewayHash);
  let deviceHashInBytes = ipfsTools.getBytes32FromIpfsHash(deviceHash);

  beforeEach(async () => {
    RC = await RegistryContract.new();
  });

  it('RC should deployed properly', async () => {
    let RCOwner = await RC.owner.call();
    assert.equal(RCOwner, owner, "truffle assign the first account as contract deployer by default");
  });

  //----------------------- Storing Payload -----------------------//

  it('GATEWAY can store the hash of the payload', async () => {
    // store device authentication payload (deviceHashInBytes) to be verified by vendor
    let tx = await RC.storeAuthNPayload(deviceHashInBytes, device, vendor, { from: GC });

    truffleAssert.eventEmitted(tx, 'NewPayloadAdded', { sender: GC, IPFSHash: deviceHashInBytes });
  });

  it('GATEWAY can NOT store the same payload hash', async () => {
    await RC.storeAuthNPayload(deviceHashInBytes, device, vendor, { from: GC });
    // mistakenly store the same authentication payload hash for observer payload
    await truffleAssert.reverts(
      RC.storeAuthNPayload(deviceHashInBytes, observer, vendor, { from: GC }), 'payload must not exist'
    );
  });

  //----------------------- Checking Payload -----------------------//

  it('VENDOR can check if he is given VALID payload', async () => {
    await RC.storeAuthNPayload(deviceHashInBytes, device, vendor, { from: GC });
    // check if deviceHashInBytes is indeed for vendor
    let valid = await RC.isValidPayloadForVerifier(deviceHashInBytes, { from: vendor });
    assert.equal(valid, true, "there is a payload for verifier vendor");
  });

  it('VENDOR can check if he is given INVALID FAKE payload', async () => {
    await RC.storeAuthNPayload(deviceHashInBytes, device, vendor, { from: GC });
    // generate fake payload
    const fakeHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcFAKE';
    let fakeHashBytes = ipfsTools.getBytes32FromIpfsHash(fakeHash);
    let valid = await RC.isValidPayloadForVerifier(fakeHashBytes, { from: vendor });
    assert.equal(valid, false, "there is no such payload for verifier vendor");
  });

  it('VENDOR can check if he is given INVALID NOT FOR GIVEN VERIFIER payload', async () => {
    await RC.storeAuthNPayload(deviceHashInBytes, device, vendor, { from: GC });
    // the payload is not for observer, it was supposed to be for vendor
    let valid = await RC.isValidPayloadForVerifier(deviceHashInBytes, { from: observer });
    assert.equal(valid, false, "there is no such payload for observer");
  });

  //----------------------- Validating Device -----------------------//

  it('VENDOR can NOT verify the DEVICE due to invalid HASH', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    await RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: ISP });
    await RC.storeAuthNPayload(deviceHashInBytes, device, vendor, { from: GC });
    // generate fake payload
    const fakeHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcFAKE';
    let fakeHashBytes = ipfsTools.getBytes32FromIpfsHash(fakeHash);
    // this payload does not exist
    await truffleAssert.reverts(
      RC.verifyAuthNDevice(fakeHashBytes, GC, device, { from: vendor }), 'payload must exist'
    );
  });

  it('VENDOR can NOT verify the DEVICE due to invalid TARGET', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    await RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: ISP });
    await RC.storeAuthNPayload(deviceHashInBytes, device, vendor, { from: GC });
    // the payload does not contain observer address, it was supposed to be for device
    await truffleAssert.reverts(
      RC.verifyAuthNDevice(deviceHashInBytes, GC, observer, { from: vendor }), 'must verify correct target'
    );
  });

  it('VENDOR can NOT verify the DEVICE due to invalid VERIFIER', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    await RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: ISP });
    await RC.storeAuthNPayload(deviceHashInBytes, device, vendor, { from: GC });
    // the payload is not for given observer verifier, it was supposed to be verified by vendor
    await truffleAssert.reverts(
      RC.verifyAuthNDevice(deviceHashInBytes, GC, device, { from: observer }), 'only for valid verifier'
    );
  });

  it('VENDOR can NOT verify the DEVICE due to invalid GATEWAY', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    await RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: ISP });
    await RC.storeAuthNPayload(deviceHashInBytes, device, vendor, { from: GC });
    // the payload is not for given observer gateway, it was supposed to be for GC
    await truffleAssert.reverts(
      RC.verifyAuthNDevice(deviceHashInBytes, observer, device, { from: vendor }), 'gateway must be trusted first'
    );
  });

  it('VENDOR can verify the DEVICE correctly', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    await RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: ISP });
    await RC.storeAuthNPayload(deviceHashInBytes, device, vendor, { from: GC });

    let status = await RC.isTrustedDevice(device, { from: observer });
    assert.equal(status, false, "device address is NOT in the trusted list");

    let tx = await RC.verifyAuthNDevice(deviceHashInBytes, GC, device, { from: vendor });
    truffleAssert.eventEmitted(tx, 'DeviceVerified', { sender: vendor, gateway: GC, device: device });

    status = await RC.isTrustedDevice(device, { from: observer });
    assert.equal(status, true, "device address has been put into the trusted list");
  });

  //----------------------- Revoking Device -----------------------//

  it('GATEWAY can NOT revoke the DEVICE due to invalid PAYLOAD (not exist)', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    await RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: ISP });
    await RC.storeAuthNPayload(deviceHashInBytes, device, vendor, { from: GC });
    await RC.verifyAuthNDevice(deviceHashInBytes, GC, device, { from: vendor });
    // generate fake payload
    const fakeHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcFAKE';
    let fakeHashBytes = ipfsTools.getBytes32FromIpfsHash(fakeHash);
    // this payload does not exist
    await truffleAssert.reverts(
      RC.deleteTrustedDevice(fakeHashBytes, device, { from: GC }), 'payload must exist'
    );
  });

  it('GATEWAY can NOT revoke the DEVICE due to invalid SOURCE', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    await RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: ISP });
    await RC.storeAuthNPayload(deviceHashInBytes, device, vendor, { from: GC });
    await RC.verifyAuthNDevice(deviceHashInBytes, GC, device, { from: vendor });

    // GC is the one who requests device authentication, therefore only him can revoke
    await truffleAssert.reverts(
      RC.deleteTrustedDevice(deviceHashInBytes, device, { from: observer }), 'only for original source'
    );
  });

  it('GATEWAY can NOT revoke the DEVICE due to has not been verified yet', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    await RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: ISP });
    await RC.storeAuthNPayload(deviceHashInBytes, device, vendor, { from: GC });
    
    // the device has not been verified yet
    await truffleAssert.reverts(
      RC.deleteTrustedDevice(deviceHashInBytes, device, { from: GC }), 'device must be trusted first'
    );
  });

  it('GATEWAY can revoke the DEVICE properly', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    await RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: ISP });
    await RC.storeAuthNPayload(deviceHashInBytes, device, vendor, { from: GC });
    await RC.verifyAuthNDevice(deviceHashInBytes, GC, device, { from: vendor });
    
    let status = await RC.isTrustedDevice(device, { from: observer });
    assert.equal(status, true, "device address has been put into the trusted list");

    let tx = await RC.deleteTrustedDevice(deviceHashInBytes, device, { from: GC });
    truffleAssert.eventEmitted(tx, 'DeviceRevoked', { sender: GC, device: device });

    status = await RC.isTrustedDevice(device, { from: observer });
    assert.equal(status, false, "device address has been revoked");
  });
});