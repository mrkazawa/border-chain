const RegistryContract = artifacts.require("RegistryContract");
const ISPContract = artifacts.require("ISPContract");
const truffleAssert = require('truffle-assertions');
const ipfsTools = require('./ipfs_tools');

const gatewayHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTGATEWAY';

contract('Integration test for Gateway Authentication', (accounts) => {
  const owner = accounts[0]; // owner of all contracts (RC and IC)
  const GCAccount = accounts[1];
  const domainOwner = accounts[6];
  const observer = accounts[9];

  let RC;
  let IC;
  let RCAddress;
  let ICAddress;
  let gatewayHashInBytes = ipfsTools.getBytes32FromIpfsHash(gatewayHash);

  beforeEach(async () => {
    RC = await RegistryContract.deployed(); // singleton RC
    IC = await ISPContract.deployed(); // singleton IC
    RCAddress = RC.address;
    ICAddress = IC.address;
  });

  it('should store the hash of the payload', async () => {
    let tx = await RC.storeAuthNPayload(gatewayHashInBytes, GCAccount, ICAddress, { from: domainOwner });

    truffleAssert.eventEmitted(tx, 'NewPayloadAdded', { sender: domainOwner, IPFSHash: gatewayHashInBytes });
  });

  it('should NOT store the same payload hash', async () => {
    // mistakenly store the same authentication payload hash
    await truffleAssert.reverts(
      RC.storeAuthNPayload(gatewayHashInBytes, observer, ICAddress, { from: domainOwner }), 'payload must not exist'
    );
  });

  it('should NOT verify the GATEWAY due to invalid HASH', async () => {
    let status = await RC.isTrustedGateway(GCAccount, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    const fakeHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcFAKE';
    let fakeHashBytes = ipfsTools.getBytes32FromIpfsHash(fakeHash);
    await truffleAssert.reverts(
      IC.verifyGateway(RCAddress, fakeHashBytes, GCAccount, { from: owner }), 'payload must exist'
    );
  });

  it('should NOT verify the GATEWAY due to invalid TARGET', async () => {
    let status = await RC.isTrustedGateway(GCAccount, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    await truffleAssert.reverts(
      IC.verifyGateway(RCAddress, gatewayHashInBytes, observer, { from: owner }), 'must verify correct target'
    );
  });

  it('should NOT verify the GATEWAY due to invalid VERIFIER', async () => {
    let status = await RC.isTrustedGateway(GCAccount, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    fakeIC = await ISPContract.new();
    await truffleAssert.reverts(
      fakeIC.verifyGateway(RCAddress, gatewayHashInBytes, GCAccount, { from: owner }), 'only for valid verifier'
    );
  });

  it('should NOT verify the GATEWAY due to invalid contract OWNER', async () => {
    let status = await RC.isTrustedGateway(GCAccount, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    await truffleAssert.reverts(
      IC.verifyGateway(RCAddress, gatewayHashInBytes, GCAccount, { from: observer }), 'only for owner'
    );
  });

  it('should verify the GATEWAY correctly', async () => {
    let status = await RC.isTrustedGateway(GCAccount, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    await IC.verifyGateway(RCAddress, gatewayHashInBytes, GCAccount, { from: owner });

    status = await RC.isTrustedGateway(GCAccount, { from: observer });
    assert.equal(status, true, "gateway address has been put into the trusted list");
  });
});