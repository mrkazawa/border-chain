const RC = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');
const ipfsTools = require('./ipfs_tools');

// IPFS hash examples
const IPFSHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcCLAL';
const deviceHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiDEVICE';

contract('Unit tests for Registry Contract', (accounts) => {
  const RCAccount = accounts[0];
  const GCAccount = accounts[1];
  const VCAccount = accounts[2];
  const NCAccount = accounts[3];
  const domainOwner = accounts[6];
  const device = accounts[7];
  const observer = accounts[9];

  beforeEach(function() {
  });

  it('should deployed properly', async () => {
    let RCInstance = await RC.new();
    let RCOwner = await RCInstance.owner.call();

    assert.equal(RCOwner, RCAccount, "truffle assign the first account as contract deployer by default");
  });

  it('should store the hash of the payload properly', async () => {
    let RCInstance = await RC.new();
    let IPFSHashInBytes = ipfsTools.getBytes32FromIpfsHash(IPFSHash);
    // store authentication payload hash from GC to be verified by NC
    let tx = await RCInstance.storeAuthNPayload(IPFSHashInBytes, GCAccount, NCAccount, { from: domainOwner });

    truffleAssert.eventEmitted(tx, 'NewPayloadAdded', { sender: domainOwner, IPFSHash: IPFSHashInBytes });
  });

  it('should NOT store the same payload hash', async () => {
    let RCInstance = await RC.new();
    let IPFSHashInBytes = ipfsTools.getBytes32FromIpfsHash(IPFSHash);
    // store authentication payload hash from GC to be verified by NC
    await RCInstance.storeAuthNPayload(IPFSHashInBytes, GCAccount, NCAccount, { from: domainOwner });

    // mistakenly store the authentication same payload hash from GC to be verified by VC
    await truffleAssert.reverts(
      RCInstance.storeAuthNPayload(IPFSHashInBytes, accounts[4], VCAccount, { from: domainOwner }), 'payload must not exist'
    );
  });

  it('should verify the GATEWAY correctly', async () => {
    let RCInstance = await RC.new();
    let IPFSHashInBytes = ipfsTools.getBytes32FromIpfsHash(IPFSHash);

    let status = await RCInstance.isTrustedGateway(GCAccount, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    await RCInstance.storeAuthNPayload(IPFSHashInBytes, GCAccount, NCAccount, { from: domainOwner });
    let tx = await RCInstance.verifyAuthNGateway(IPFSHashInBytes, GCAccount, { from: NCAccount });
    truffleAssert.eventEmitted(tx, 'GatewayVerified', { sender: NCAccount, gateway: GCAccount });

    status = await RCInstance.isTrustedGateway(GCAccount, { from: observer });
    assert.equal(status, true, "gateway address has been put into the trusted list");
  });

  it('should NOT verify the GATEWAY due to invalid HASH', async () => {
    let RCInstance = await RC.new();
    let IPFSHashInBytes = ipfsTools.getBytes32FromIpfsHash(IPFSHash);

    let status = await RCInstance.isTrustedGateway(GCAccount, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    await RCInstance.storeAuthNPayload(IPFSHashInBytes, GCAccount, NCAccount, { from: domainOwner });

    const fakeHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcFAKE';
    let fakeHashBytes = ipfsTools.getBytes32FromIpfsHash(fakeHash);
    await truffleAssert.reverts(
      RCInstance.verifyAuthNGateway(fakeHashBytes, GCAccount, { from: NCAccount }), 'payload must exist'
    );
  });

  it('should NOT verify the GATEWAY due to invalid VERIFIER', async () => {
    let RCInstance = await RC.new();
    let IPFSHashInBytes = ipfsTools.getBytes32FromIpfsHash(IPFSHash);

    let status = await RCInstance.isTrustedGateway(GCAccount, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    await RCInstance.storeAuthNPayload(IPFSHashInBytes, GCAccount, NCAccount, { from: domainOwner });
    await truffleAssert.reverts(
      RCInstance.verifyAuthNGateway(IPFSHashInBytes, GCAccount, { from: observer }), 'only for valid verifier'
    );
  });

  it('should NOT verify the GATEWAY due to invalid TARGET', async () => {
    let RCInstance = await RC.new();
    let IPFSHashInBytes = ipfsTools.getBytes32FromIpfsHash(IPFSHash);

    let status = await RCInstance.isTrustedGateway(GCAccount, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    await RCInstance.storeAuthNPayload(IPFSHashInBytes, GCAccount, NCAccount, { from: domainOwner });
    await truffleAssert.reverts(
      RCInstance.verifyAuthNGateway(IPFSHashInBytes, observer, { from: NCAccount }), 'must verify correct target'
    );
  });

  /*
  it('should verify the DEVICE correctly', async () => {
    let RCInstance = await RC.new();
    let IPFSHashInBytes = ipfsTools.getBytes32FromIpfsHash(IPFSHash);

    let status = await RCInstance.isTrustedDevice(device, { from: observer });
    assert.equal(status, false, "device address is NOT in the trusted list");

    await RCInstance.storeAuthNPayload(IPFSHashInBytes, GCAccount, NCAccount, { from: domainOwner });
    await RCInstance.verifyAuthNGateway(IPFSHashInBytes, GCAccount, { from: NCAccount });

    let deviceHashInBytes = ipfsTools.getBytes32FromIpfsHash(deviceHash);
    await RCInstance.storeAuthNPayload(deviceHashInBytes, device, VCAccount, { from: GCAccount });
    await RCInstance.verifyAuthNGateway(deviceHashInBytes, device, { from: VCAccount });

    status = await RCInstance.isTrustedGateway(GCAccount, { from: observer });
    assert.equal(status, true, "gateway address has been put into the trusted list");
  });*/
});