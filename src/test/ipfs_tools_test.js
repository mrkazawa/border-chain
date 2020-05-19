const ipfsTools = require('./ipfs_tools');

const IPFSHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcCLAL';
const IPFSHashInBytes = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231';

describe('Unit tests for IPFS tools', function () {
  it('should convert IPFS hash to bytes32 correctly', async () => {
    const converted = ipfsTools.getBytes32FromIpfsHash(IPFSHash);
    assert.equal(converted, IPFSHashInBytes, "converted correctly");
  });

  it('should convert bytes32 to IPFS hash correctly', async () => {
    const converted = ipfsTools.getIpfsHashFromBytes32(IPFSHashInBytes);
    assert.equal(converted, IPFSHash, "converted correctly");
  });
});