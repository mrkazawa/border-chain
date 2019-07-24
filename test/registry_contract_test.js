const RC = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');
const ipfsTools = require('./ipfs_tools');

const IPFSHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcCLAL';

contract('Unit tests for Registry Contract', (accounts) => {
  const RCAccount = accounts[0];
  const GCAccount = accounts[1];
  const VCAccount = accounts[2];
  const NCAccount = accounts[3];

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
    let tx = await RCInstance.storeAuthNPayload(IPFSHashInBytes, NCAccount, { from: GCAccount });

    /*
    assert.equal(result.logs.length, 1, "an event was triggered");
    assert.equal(result.logs[0].event, "NewPayloadAdded", "the event type is correct");
    assert.equal(result.logs[0].args.sender, GCAccount, "the event broadcast the correct target address");
    assert.equal(result.logs[0].args.IPFShash, IPFSHashInBytes, "the event broadcast the correct payload hash");*/

    truffleAssert.eventEmitted(tx, 'NewPayloadAdded', { sender: GCAccount, IPFSHash: IPFSHashInBytes });
  });

  it('should not store the same payload hash', async () => {
    let RCInstance = await RC.new();
    let IPFSHashInBytes = ipfsTools.getBytes32FromIpfsHash(IPFSHash);
    // store authentication payload hash from GC to be verified by NC
    await RCInstance.storeAuthNPayload(IPFSHashInBytes, NCAccount, { from: GCAccount });

    // mistakenly store the authentication same payload hash from GC to be verified by VC
    await truffleAssert.reverts(
      RCInstance.storeAuthNPayload(IPFSHashInBytes, VCAccount, { from: GCAccount }), 'payload must not exist'
    );
  });
});