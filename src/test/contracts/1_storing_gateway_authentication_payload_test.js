const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

/**
 * Gateway Authentication Test Scenario Part 1.
 * 
 * This test to verify the functionality of "storePayload" method
 * in the RegistryContract to provide anchoring service for
 * Gateway Authentication in our IoT domain.
 * 
 * The Domain Owner will request for approval to the Internet Service
 * Provider (ISP) by sending a metadata of authentiation request
 * to the smart contract.
 */
describe('Gateway Authentication Part 1 -- Storing Payload Test', function () {
  contract('#storePayload()', function (accounts) {
    const gatewayAddress = accounts[1];
    const ispAddress = accounts[2];
    const ownerAddress = accounts[6];
    const observerAddress = accounts[9];

    const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231';
    let RC;

    beforeEach('deploy contract', async function () {
      RC = await RegistryContract.new();
    });

    it('DOMAIN OWNER can store the hash of the payload', async function () {
      const tx = await RC.storePayload(payloadHash, gatewayAddress, ispAddress, {
        from: ownerAddress
      });
      truffleAssert.eventEmitted(tx, 'PayloadAdded', {
        payloadHash: payloadHash,
        sender: ownerAddress,
        target: gatewayAddress,
        approver: ispAddress
      });
    });

    it('DOMAIN OWNER can NOT store the same payload hash', async function () {
      await RC.storePayload(payloadHash, gatewayAddress, ispAddress, {
        from: ownerAddress
      });
      // mistakenly store the same authentication payload hash twice
      await truffleAssert.reverts(
        RC.storePayload(payloadHash, observerAddress, ispAddress, {
          from: ownerAddress
        }), 'payload must not exist'
      );
    });
  });
});