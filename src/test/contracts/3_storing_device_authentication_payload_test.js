const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

/**
 * Gateway Authentication Test Scenario Part 1.
 * 
 * This test to verify the functionality of "storePayload" method
 * in the RegistryContract to provide anchoring service for
 * Device Authentication in our IoT domain.
 * 
 * The Gateway will piggyback request from IoT device to request
 * for approval to the IoT vendor by sending a metadata of authentiation
 * request to the smart contract.
 */
describe('Device Authentication Part 1 -- Storing Payload Test', function () {
  contract('#storePayload()', function (accounts) {
    const gatewayAddress = accounts[1];
    const vendorAddress = accounts[3];
    const deviceAddress = accounts[4];
    const observerAddress = accounts[9];

    const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f200';
    let RC;

    beforeEach('deploy contract', async function () {
      RC = await RegistryContract.new();
    });

    it('GATEWAY can store the hash of the payload', async function () {
      const tx = await RC.storePayload(payloadHash, deviceAddress, vendorAddress, {
        from: gatewayAddress
      });
      truffleAssert.eventEmitted(tx, 'PayloadAdded', {
        payloadHash: payloadHash,
        sender: gatewayAddress,
        target: deviceAddress,
        approver: vendorAddress
      });
    });

    it('GATEWAY can NOT store the same payload hash', async function () {
      await RC.storePayload(payloadHash, deviceAddress, vendorAddress, {
        from: gatewayAddress
      });
      // mistakenly store the same authentication payload hash twice
      await truffleAssert.reverts(
        RC.storePayload(payloadHash, observerAddress, vendorAddress, {
          from: gatewayAddress
        }), 'payload must not exist'
      );
    });
  });
});