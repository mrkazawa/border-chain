const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');
const ipfsTools = require('./ipfs_tools');

const gatewayHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTGATEWAY';

contract('Gateway Authentication Test Scenarios', (accounts) => {
  const owner = accounts[0]; // owner of RC contract
  const GC = accounts[1]; // gateway contract address
  const ISP = accounts[2]; // ISP verifier address
  const domainOwner = accounts[6]; // domain owner address
  const observer = accounts[9]; // anonymous node address

  let RC;
  let gatewayHashInBytes = ipfsTools.getBytes32FromIpfsHash(gatewayHash);

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

  it('ISP can check if he is given INVALID FAKE payload', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    // generate fake payload
    const fakeHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcFAKE';
    let fakeHashBytes = ipfsTools.getBytes32FromIpfsHash(fakeHash);
    let valid = await RC.isValidPayloadForVerifier(fakeHashBytes, { from: ISP });
    assert.equal(valid, false, "there is no such payload for verifier ISP");
  });

  it('ISP can check if he is given INVALID NOT FOR GIVEN VERIFIER payload', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    // the payload is not for observer, it was supposed to be for ISP
    let valid = await RC.isValidPayloadForVerifier(gatewayHashInBytes, { from: observer });
    assert.equal(valid, false, "there is no such payload for observer");
  });

  //----------------------- Validating Payload -----------------------//

  it('ISP can NOT verify the GATEWAY due to invalid HASH', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    // check for gateway status
    let status = await RC.isTrustedGateway(GC, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");
    // generate fake payload
    const fakeHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcFAKE';
    let fakeHashBytes = ipfsTools.getBytes32FromIpfsHash(fakeHash);
    // this payload does not exist
    await truffleAssert.reverts(
      RC.verifyAuthNGateway(fakeHashBytes, GC, { from: ISP }), 'payload must exist'
    );
  });

  it('ISP can NOT verify the GATEWAY due to invalid TARGET', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    let status = await RC.isTrustedGateway(GC, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");
    // the payload does not contain observer address, it was supposed to be for GC
    await truffleAssert.reverts(
      RC.verifyAuthNGateway(gatewayHashInBytes, observer, { from: ISP }), 'must verify correct target'
    );
  });

  it('ISP can NOT verify the GATEWAY due to invalid VERIFIER', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    let status = await RC.isTrustedGateway(GC, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");
    // the payload is not for given observer verifier, it was supposed to be verified by ISP
    await truffleAssert.reverts(
      RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: observer }), 'only for valid verifier'
    );
  });

  it('ISP can verify the GATEWAY correctly', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GC, ISP, { from: domainOwner });
    let status = await RC.isTrustedGateway(GC, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    let tx = await RC.verifyAuthNGateway(gatewayHashInBytes, GC, { from: ISP });
    truffleAssert.eventEmitted(tx, 'GatewayVerified', { sender: ISP, gateway: GC });

    status = await RC.isTrustedGateway(GC, { from: observer });
    assert.equal(status, true, "gateway address has been put into the trusted list");
  });
});