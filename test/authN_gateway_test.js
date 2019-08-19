const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');
const ipfsTools = require('./ipfs_tools');

const gatewayHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTGATEWAY';
const deviceHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTidevice';

contract('Gateway Authentication Test Scenarios', (accounts) => {
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

  it('DOMAIN OWNER can store the hash of the payload', async () => {
    // store GC authentication payload (gatewayHashInBytes) to be verified by ISP
    let tx = await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    truffleAssert.eventEmitted(tx, 'NewPayloadAdded', { sender: domainOwner, IPFSHash: gatewayHashInBytes });
  });

  it('DOMAIN OWNER can NOT store the same payload hash', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    // mistakenly store the same authentication payload hash for observer payload
    await truffleAssert.reverts(
      RC.storeAuthNPayload(gatewayHashInBytes, observer, ISP, { from: domainOwner }), 'payload must not exist'
    );
  });

  //----------------------- Checking Payload -----------------------//

  it('ISP can check if he is given VALID payload', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    // check if gatewayHashInBytes is indeed for ISP
    let valid = await RC.isValidPayloadForVerifier(gatewayHashInBytes, { from: ISP });
    assert.equal(valid, true, "there is a payload for verifier ISP");
  });

  it('ISP can check if he is given INVALID payload (not exist)', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    // generate fake payload
    const fakeHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcFAKE';
    let fakeHashBytes = ipfsTools.getBytes32FromIpfsHash(fakeHash);
    let valid = await RC.isValidPayloadForVerifier(fakeHashBytes, { from: ISP });
    assert.equal(valid, false, "there is no such payload for verifier ISP");
  });

  it('ISP can check if he is given INVALID payload (not for requester)', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    // the payload is not for observer, it was supposed to be for ISP
    let valid = await RC.isValidPayloadForVerifier(gatewayHashInBytes, { from: observer });
    assert.equal(valid, false, "there is no such payload for observer");
  });

  //----------------------- Validating Gateway -----------------------//

  it('ISP can NOT verify the GATEWAY due to invalid PAYLOAD (not exist)', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    // generate fake payload
    const fakeHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcFAKE';
    let fakeHashBytes = ipfsTools.getBytes32FromIpfsHash(fakeHash);
    // this payload does not exist
    await truffleAssert.reverts(
      RC.verifyAuthNGateway(fakeHashBytes, GC, { from: ISP }), 'payload must exist'
    );
  });

  it('ISP can NOT verify the GATEWAY due to invalid PAYLOAD (already verified)', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    await RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: ISP });
    // the payload already verified, cannot verify the same payload again
    await truffleAssert.reverts(
      RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: ISP }), 'payload must not verified'
    );
  });

  it('ISP can NOT verify the GATEWAY due to invalid TARGET', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    // the payload does not contain observer address, it was supposed to be for GC
    await truffleAssert.reverts(
      RC.verifyAuthNGateway(gatewayHashInBytes, observer, { from: ISP }), 'must verify correct target'
    );
  });

  it('ISP can NOT verify the GATEWAY due to invalid VERIFIER', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    // the payload is not for given observer verifier, it was supposed to be verified by ISP
    await truffleAssert.reverts(
      RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: observer }), 'only for valid verifier'
    );
  });

  it('ISP can verify the GATEWAY correctly', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });

    let status = await RC.isTrustedGateway(GC, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    let valid = await RC.isValidPayloadForVerifier(gatewayHashInBytes, { from: ISP });
    assert.equal(valid, true, "there is a payload for verifier ISP");

    let tx = await RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: ISP });
    truffleAssert.eventEmitted(tx, 'GatewayVerified', { sender: ISP, gateway: GC });

    status = await RC.isTrustedGateway(GC, { from: observer });
    assert.equal(status, true, "gateway address has been put into the trusted list");

    valid = await RC.isValidPayloadForVerifier(gatewayHashInBytes, { from: ISP });
    assert.equal(valid, false, "there is no payload since it has been verified");
  });

  //----------------------- Revoking Gateway -----------------------//

  it('DOMAIN OWNER can NOT revoke the GATEWAY due to invalid PAYLOAD (not exist)', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    await RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: ISP });
    // generate fake payload
    const fakeHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcFAKE';
    let fakeHashBytes = ipfsTools.getBytes32FromIpfsHash(fakeHash);
    // this payload does not exist
    await truffleAssert.reverts(
      RC.deleteTrustedGateway(fakeHashBytes, GC, { from: domainOwner }), 'payload must exist'
    );
  });

  it('DOMAIN OWNER can NOT revoke the GATEWAY due to invalid SOURCE', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    await RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: ISP });
    // domainOwner is the one who request GC authentication, therefore only him can revoke
    await truffleAssert.reverts(
      RC.deleteTrustedGateway(gatewayHashInBytes, GC, { from: observer }), 'only for original source'
    );
  });

  it('DOMAIN OWNER can NOT revoke the GATEWAY due to has not been verified yt', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    // ISP has not verified the GC yet
    await truffleAssert.reverts(
      RC.deleteTrustedGateway(gatewayHashInBytes, GC, { from: domainOwner }), 'gateway must be trusted first'
    );
  });

  it('DOMAIN OWNER can revoke the GATEWAY properly', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    await RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: ISP });
    await RC.storeAuthNPayload(deviceHashInBytes, device, vendor, { from: GC });
    await RC.verifyAuthNDevice(deviceHashInBytes, GC, device, { from: vendor });

    let status = await RC.isTrustedGateway(GC, { from: observer });
    assert.equal(status, true, "gateway address has been put into the trusted list");
    status = await RC.isTrustedDevice(device, { from: observer });
    assert.equal(status, true, "device address has been put into the trusted list");

    let tx = await RC.deleteTrustedGateway(gatewayHashInBytes, GC, { from: domainOwner });
    truffleAssert.eventEmitted(tx, 'GatewayRevoked', { sender: domainOwner, gateway: GC });

    status = await RC.isTrustedGateway(GC, { from: observer });
    assert.equal(status, false, "gateway address has been revokedt");
    // device attached to the gateway should lose trust
    status = await RC.isTrustedDevice(device, { from: observer });
    assert.equal(status, false, "device address is not trusted since the gateway is revoked");
  });
});