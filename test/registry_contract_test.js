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

  //-------------------------------- Event Checker --------------------------------//

  it('should emit NewPayloadAdded event', async () => {
    // store authentication payload hash for GC to be verified by IC
    let tx = await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });

    truffleAssert.eventEmitted(tx, 'NewPayloadAdded', { sender: domainOwner, IPFSHash: gatewayHashInBytes });
  });

  it('should emit GatewayVerified event', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });
    // ICAddress verify GCAddress from the gatewayHashInBytes payload
    let tx = await RC.verifyAuthNGateway(gatewayHashInBytes, GCAddress, { from: ICAddress });

    truffleAssert.eventEmitted(tx, 'GatewayVerified', { sender: ICAddress, gateway: GCAddress });
  });

  it('should emit DeviceVerified event', async () => {
    await RC.storeAuthNPayload(gatewayHashInBytes, GCAddress, ICAddress, { from: domainOwner });
    // ICAddress verify GCAddress from the gatewayHashInBytes payload
    await RC.verifyAuthNGateway(gatewayHashInBytes, GCAddress, { from: ICAddress });
    await RC.storeAuthNPayload(deviceHashInBytes, device, VCAddress, { from: GCAddress });
    // VCAddress verify device from the deviceHashInBytes payload
    let tx = await RC.verifyAuthNDevice(deviceHashInBytes, GCAddress, device, { from: VCAddress });

    truffleAssert.eventEmitted(tx, 'DeviceVerified', { sender: VCAddress, gateway: GCAddress, device: device });
  });
});