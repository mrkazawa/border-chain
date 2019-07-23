const ipfsTools = require('./ipfs_tools');

describe('Unit testing for IPFS tools', function () {
    it('should convert IPFS hash to bytes32 correctly', function * () {
        const IPFSHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcCLAL';
        const RealBytes32 = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231';

        const converted = ipfsTools.getBytes32FromIpfsHash(IPFSHash);
        assert.equal(converted, aRealBytes32, "converted correctly");
    });

    it('should convert bytes32 to IPFS hash correctly', function * () {
        const IPFSHash = 'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcCLAL';
        const RealBytes32 = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231';

        const converted = ipfsTools.getIpfsHashFromBytes32(RealBytes32);
        assert.equal(converted, IPFSHash, "converted correctly");
    });
});