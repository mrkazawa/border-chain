const RC = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');
const ipfsTools = require('./ipfs_tools');

const IPFSHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcCLAL';

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

  it('should verify the gateway correctly', async () => {
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
});