const RegistryContract = artifacts.require("RegistryContract");

const truffleAssert = require('truffle-assertions');
const ipfsTools = require('./ipfs_tools');

// IPFS hash examples
const gatewayHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTGATEWAY';
const deviceHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTidevice';

contract('Unit tests for Registry Contract', (accounts) => {
  const owner = accounts[0];
  const GCAddress = accounts[1];
  const VCAddress = accounts[2];
  const ICAddress = accounts[3];
  const domainOwner = accounts[6];
  const device = accounts[7];
  const observer = accounts[9];

  const gatewayHashInBytes = ipfsTools.getBytes32FromIpfsHash(gatewayHash);
  const deviceHashInBytes = ipfsTools.getBytes32FromIpfsHash(deviceHash);

  let RC;

  beforeEach(async () => {
    RC = await RegistryContract.new();
  });

  it('should deployed properly', async () => {
    let RCOwner = await RC.owner.call();
    assert.equal(RCOwner, owner, "truffle assign the first account as contract deployer by default");
  });

  it('should store the hash of the payload properly', async () => {
    // store authentication payload hash for GC to be verified by IC
    let tx = await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });

    truffleAssert.eventEmitted(tx, 'NewPayloadAdded', { sender: domainOwner, IPFSHash: gatewayHashInBytes });
  });

  it('should NOT store the same payload hash', async () => {
    // store authentication payload hash from GC to be verified by NC
    await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });
    // mistakenly store the authentication same payload hash from GC to be verified by VC
    await truffleAssert.reverts(
      RC.storeAuthNPayload(gatewayHashInBytes, accounts[4], VCAddress, { from: domainOwner }), 'payload must not exist'
    );
  });

  //-------------------------------- GATEWAY AUTHN --------------------------------//

  it('should verify the GATEWAY correctly', async () => {
    let status = await RC.isTrustedGateway(GCAddress, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });
    let tx = await RC.verifyAuthNGateway(gatewayHashInBytes, GCAddress, { from: ICAddress });
    truffleAssert.eventEmitted(tx, 'GatewayVerified', { sender: ICAddress, gateway: GCAddress });

    status = await RC.isTrustedGateway(GCAddress, { from: observer });
    assert.equal(status, true, "gateway address has been put into the trusted list");
  });

  it('should NOT verify the GATEWAY due to invalid HASH', async () => {
    let status = await RC.isTrustedGateway(GCAddress, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });

    const fakeHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcFAKE';
    let fakeHashBytes = ipfsTools.getBytes32FromIpfsHash(fakeHash);
    await truffleAssert.reverts(
      RC.verifyAuthNGateway(fakeHashBytes, GCAddress, { from: ICAddress }), 'payload must exist'
    );
  });

  it('should NOT verify the GATEWAY due to invalid VERIFIER', async () => {
    let status = await RC.isTrustedGateway(GCAddress, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });
    await truffleAssert.reverts(
      RC.verifyAuthNGateway(gatewayHashInBytes, GCAddress, { from: observer }), 'only for valid verifier'
    );
  });

  it('should NOT verify the GATEWAY due to invalid TARGET', async () => {
    let status = await RC.isTrustedGateway(GCAddress, { from: observer });
    assert.equal(status, false, "gateway address is NOT in the trusted list");

    await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });
    await truffleAssert.reverts(
      RC.verifyAuthNGateway(gatewayHashInBytes, observer, { from: ICAddress }), 'must verify correct target'
    );
  });

  //-------------------------------- DEVICE AUTHN --------------------------------//

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