const RC = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');
const ipfsTools = require('./ipfs_tools');

const gatewayHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTGATEWAY';

contract('Integration test for Gateway Authentication', (accounts) => {
  const GCAccount = accounts[1];
  const NCAccount = accounts[3];
  const domainOwner = accounts[6];
  const observer = accounts[9];

  let RCInstance;
  let gatewayHashInBytes = ipfsTools.getBytes32FromIpfsHash(gatewayHash);

  beforeEach(async () => {
    RCInstance = await RC.deployed(); // singleton RC
  });

  it('should store the hash of the payload properly', async () => {
    let tx = await RCInstance.storeAuthNPayload(gatewayHashInBytes, GCAccount, NCAccount, { from: domainOwner });

    truffleAssert.eventEmitted(tx, 'NewPayloadAdded', { sender: domainOwner, IPFSHash: gatewayHashInBytes });
  });

  it('should NOT store the same payload hash', async () => {
    // mistakenly store the same authentication payload hash
    await truffleAssert.reverts(
      RCInstance.storeAuthNPayload(gatewayHashInBytes, observer, NCAccount, { from: domainOwner }), 'payload must not exist'
    );
  });

  it('should NOT verify the GATEWAY due to invalid HASH', async () => {
    let status = await RCInstance.isTrustedGateway(GCAccount, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    const fakeHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcFAKE';
    let fakeHashBytes = ipfsTools.getBytes32FromIpfsHash(fakeHash);
    await truffleAssert.reverts(
      RCInstance.verifyAuthNGateway(fakeHashBytes, GCAccount, { from: NCAccount }), 'payload must exist'
    );
  });

  it('should NOT verify the GATEWAY due to invalid VERIFIER', async () => {
    let status = await RCInstance.isTrustedGateway(GCAccount, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    await truffleAssert.reverts(
      RCInstance.verifyAuthNGateway(gatewayHashInBytes, GCAccount, { from: observer }), 'only for valid verifier'
    );
  });

  it('should NOT verify the GATEWAY due to invalid TARGET', async () => {
    let status = await RCInstance.isTrustedGateway(GCAccount, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    await truffleAssert.reverts(
      RCInstance.verifyAuthNGateway(gatewayHashInBytes, observer, { from: NCAccount }), 'must verify correct target'
    );
  });

  it('should verify the GATEWAY correctly', async () => {
    let status = await RCInstance.isTrustedGateway(GCAccount, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    let tx = await RCInstance.verifyAuthNGateway(gatewayHashInBytes, GCAccount, { from: NCAccount });
    truffleAssert.eventEmitted(tx, 'GatewayVerified', { sender: NCAccount, gateway: GCAccount });

    status = await RCInstance.isTrustedGateway(GCAccount, { from: observer });
    assert.equal(status, true, "gateway address has been put into the trusted list");
  });
});