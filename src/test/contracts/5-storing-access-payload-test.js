const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

/**
 * Service Authorization Test Scenario Part 1.
 * 
 * This test to verify the functionality of "storePayload" method
 * in the RegistryContract to provide anchoring service for authorization
 * in our IoT domain.
 * 
 * The Service will request for access to the Gateway by sending a
 * metadata of authorization request to the smart contract.
 */
describe('Service Authorization Part 1 -- Storing Payload Test', function () {
  contract('#storePayload()', function (accounts) {
    const gatewayAddress = accounts[1];
    const serviceAddress = accounts[2];
    const observerAddress = accounts[9];

    const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231';
    let RC;

    beforeEach('deploy contract', async function () {
      RC = await RegistryContract.new();
    });

    it('SERVICE can store the hash of the payload', async function () {
      const tx = await RC.storePayload(payloadHash, serviceAddress, gatewayAddress, {
        from: serviceAddress
      });
      truffleAssert.eventEmitted(tx, 'PayloadAdded', {
        payloadHash: payloadHash,
        sender: serviceAddress,
        target: serviceAddress,
        approver: gatewayAddress
      });
    });

    it('SERVICE can NOT store the same payload hash', async function () {
      await RC.storePayload(payloadHash, serviceAddress, gatewayAddress, {
        from: serviceAddress
      });
      // mistakenly store the same authentication payload hash twice
      await truffleAssert.reverts(
        RC.storePayload(payloadHash, observerAddress, gatewayAddress, {
          from: serviceAddress
        }), 'payload must not exist'
      );
    });
  });
});