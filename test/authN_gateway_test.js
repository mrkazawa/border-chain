const RegistryContract = artifacts.require("RegistryContract");
const ISPContract = artifacts.require("ISPContract");
const truffleAssert = require('truffle-assertions');
const ipfsTools = require('./ipfs_tools');

const gatewayHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTGATEWAY';

contract('Gateway Authentication Test Scenarios', (accounts) => {
  const owner = accounts[0]; // owner of all contracts (RC and IC)
  const GCAddress = accounts[1];
  const domainOwner = accounts[6];
  const observer = accounts[9];

  let RC;
  let IC;
  let RCAddress;
  let ICAddress;
  let gatewayHashInBytes = ipfsTools.getBytes32FromIpfsHash(gatewayHash);

  beforeEach(async () => {
    RC = await RegistryContract.new();
    IC = await ISPContract.new();
    RCAddress = RC.address;
    ICAddress = IC.address;
  });

  //----------------------- Storing Payload -----------------------//

  it('DOMAIN OWNER can store the hash of the payload', async () => {
    // store GCAddress authentication payload (gatewayHashInBytes) to be verified by ICAddress
    let tx = await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });

    truffleAssert.eventEmitted(tx, 'NewPayloadAdded', { sender: domainOwner, IPFSHash: gatewayHashInBytes });
  });

  it('DOMAIN OWNER can NOT store the same payload hash', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });
    // mistakenly store the same authentication payload hash
    await truffleAssert.reverts(
      RC.storeAuthNPayload(gatewayHashInBytes, observer, ICAddress, { from: domainOwner }), 'payload must not exist'
    );
  });

  //----------------------- Checking Payload -----------------------//

  it('ISP can check if he is given VALID payload', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });
    // check if gatewayHashInBytes is indeed for ICAddress
    let valid = await IC.isPayloadValid(RCAddress, gatewayHashInBytes, { from: owner });
    assert.equal(valid, true, "there is a payload for verifier ICAddress");
  });

  it('ISP can check if he is given INVALID FAKE payload', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });
    // generate fake payload
    const fakeHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcFAKE';
    let fakeHashBytes = ipfsTools.getBytes32FromIpfsHash(fakeHash);
    // the given payload does not exist
    await truffleAssert.reverts(
      IC.isPayloadValid(RCAddress, fakeHashBytes, { from: owner }), 'payload must exist'
    );
  });

  it('ISP can check if he is given INVALID NOT FOR GIVEN VERIFIER payload', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });
    // generate fakeIC that does not exist in the payload
    let fakeIC = await ISPContract.new();
    // the payload is not for given IC
    await truffleAssert.reverts(
      fakeIC.isPayloadValid(RCAddress, gatewayHashInBytes, { from: owner }), 'only for valid verifier'
    );
  });

  it('ISP can NOT check payload due to not IC owner', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });
    await truffleAssert.reverts(
      IC.isPayloadValid(RCAddress, gatewayHashInBytes, { from: observer }), 'only for ISPContract owner'
    );
  });

  //----------------------- Validating Payload -----------------------//

  it('ISP can NOT verify the GATEWAY due to invalid HASH', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });
    // check for gateway status
    let status = await RC.isTrustedGateway(GCAddress, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");
    // generate fake payload
    const fakeHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcFAKE';
    let fakeHashBytes = ipfsTools.getBytes32FromIpfsHash(fakeHash);
    // this payload does not exist
    await truffleAssert.reverts(
      IC.verifyGateway(RCAddress, fakeHashBytes, GCAddress, { from: owner }), 'payload must exist'
    );
  });

  it('ISP can NOT verify the GATEWAY due to invalid TARGET', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });
    let status = await RC.isTrustedGateway(GCAddress, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");
    // the payload does not contain the given target
    await truffleAssert.reverts(
      IC.verifyGateway(RCAddress, gatewayHashInBytes, observer, { from: owner }), 'must verify correct target'
    );
  });

  it('ISP can NOT verify the GATEWAY due to invalid VERIFIER (fake IC)', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });
    let status = await RC.isTrustedGateway(GCAddress, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");
    // generate fakeIC that does not exist in the payload
    let fakeIC = await ISPContract.new();
    // the payload is not for given IC
    await truffleAssert.reverts(
      fakeIC.verifyGateway(RCAddress, gatewayHashInBytes, GCAddress, { from: owner }), 'only for valid verifier'
    );
  });

  it('ISP can NOT verify the GATEWAY due to not IC onwer', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });
    let status = await RC.isTrustedGateway(GCAddress, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");
    await truffleAssert.reverts(
      IC.verifyGateway(RCAddress, gatewayHashInBytes, GCAddress, { from: observer }), 'only for ISPContract owner'
    );
  });

  it('ISP can verify the GATEWAY correctly', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });
    let status = await RC.isTrustedGateway(GCAddress, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    await IC.verifyGateway(RCAddress, gatewayHashInBytes, GCAddress, { from: owner });

    status = await RC.isTrustedGateway(GCAddress, { from: observer });
    assert.equal(status, true, "gateway address has been put into the trusted list");
  });  
});