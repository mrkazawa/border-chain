const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

/**
 * Gateway Authentication Test Scenario Part 2.
 * 
 * This test to verify the functionality of "approveGateway" method
 * in the RegistryContract to provide anchoring service for
 * Gateway Authentication in our IoT domain.
 * 
 * The Internet Service Provider (ISP) will try to verify the
 * gateway's authentication off-chain and approve it on-chain if all
 * submitted requirement is valid
 */
describe('Gateway Authentication Part 2 -- Approving Authenticaiton Test', function () {
  contract('#approveGateway()', function (accounts) {
    const gatewayAddress = accounts[1];
    const ispAddress = accounts[2];
    const ownerAddress = accounts[6];
    const observerAddress = accounts[9];

    const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231';
    const routerIp = web3.utils.fromAscii("200.100.10.10");
    let RC;

    beforeEach('deploy contract and store a payload', async function () {
      RC = await RegistryContract.new();
      await RC.storePayload(payloadHash, gatewayAddress, ispAddress, {
        from: ownerAddress
      });
    });

    it('ISP can NOT approve the GATEWAY due to invalid PAYLOAD (not exist)', async function () {
      const fakeHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f000';
      await truffleAssert.reverts(
        RC.approveGateway(fakeHash, routerIp, {
          from: ispAddress
        }), 'payload must exist'
      );
    });

    it('ISP can NOT approve the GATEWAY due to invalid PAYLOAD (already approved)', async function () {
      await RC.approveGateway(payloadHash, routerIp, {
        from: ispAddress
      });
      // duplicate approval is not allowed
      await truffleAssert.reverts(
        RC.approveGateway(payloadHash, routerIp, {
          from: ispAddress
        }), 'payload must be not approved'
      );
    });

    it('OBSERVER can NOT approve the GATEWAY due to invalid APPROVER (not authorized)', async function () {
      // an observer cannot arbitrarily verify a payload
      await truffleAssert.reverts(
        RC.approveGateway(payloadHash, routerIp, {
          from: observerAddress
        }), 'only for original approver'
      );
    });

    it('ISP can verify the GATEWAY correctly', async function () {
      let status = await RC.isTrustedGateway(gatewayAddress, {
        from: observerAddress
      });
      assert.equal(status, false, "gateway address is NOT in the trusted list");

      const tx = await RC.approveGateway(payloadHash, routerIp, {
        from: ispAddress
      });
      truffleAssert.eventEmitted(tx, 'GatewayApproved', {
        payloadHash: payloadHash,
        sender: ispAddress,
        target: gatewayAddress
      });

      status = await RC.isTrustedGateway(gatewayAddress, {
        from: observerAddress
      });
      assert.equal(status, true, "gateway address has been put into the trusted list");
    });
  });
});