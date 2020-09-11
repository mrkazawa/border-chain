const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

/**
 * Device Authentication Test Scenario Part 2.
 * 
 * This test to verify the functionality of "approveDevice" method
 * in the RegistryContract to provide anchoring service for
 * Device Authentication in our IoT domain.
 * 
 * The IoT vendor will try to verify the device's
 * authentication off-chain and approve it on-chain if all
 * submitted requirement is valid
 */
describe('Device Authentication Part 2 -- Approving Authenticaiton Test', function () {
  contract('#approveDevice() scenario 1', function (accounts) {
    const gatewayAddress = accounts[1];
    const ispAddress = accounts[2];
    const vendorAddress = accounts[3];
    const deviceAddress = accounts[4];
    const ownerAddress = accounts[6];
    const observerAddress = accounts[9];

    const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f200';
    let RC;

    beforeEach('deploy contract, store and approve gateway payload, store device payload', async function () {
      RC = await RegistryContract.new();

      // gateway authentication and approval
      const gatewayPayloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231';
      const routerIp = web3.utils.fromAscii("200.100.10.10");
      await RC.storePayload(gatewayPayloadHash, gatewayAddress, ispAddress, {
        from: ownerAddress
      });
      await RC.approveGateway(gatewayPayloadHash, routerIp, {
        from: ispAddress
      });

      // store device payload
      await RC.storePayload(payloadHash, deviceAddress, vendorAddress, {
        from: gatewayAddress
      });
    });

    it('VENDOR can NOT approve the DEVICE due to invalid HASH (not exist)', async function () {
      const fakeHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f000';
      await truffleAssert.reverts(
        RC.approveDevice(fakeHash, {
          from: vendorAddress
        }), 'payload must exist'
      );
    });

    it('VENDOR can NOT approve the DEVICE due to invalid PAYLOAD (already verified)', async function () {
      await RC.approveDevice(payloadHash, {
        from: vendorAddress
      });
      // duplicate approval is not allowed
      await truffleAssert.reverts(
        RC.approveDevice(payloadHash, {
          from: vendorAddress
        }), 'payload must be not approved'
      );
    });

    it('OBSERVER can NOT approve the DEVICE due to invalid APPROVER (not authorized)', async function () {
      // an observer cannot arbitrarily approve a payload
      await truffleAssert.reverts(
        RC.approveDevice(payloadHash, {
          from: observerAddress
        }), 'only for original approver'
      );
    });

    it('VENDOR can approve the DEVICE correctly', async function () {
      let status = await RC.isTrustedDevice(deviceAddress, {
        from: observerAddress
      });
      assert.equal(status, false, "device address is NOT in the trusted list");

      const tx = await RC.approveDevice(payloadHash, {
        from: vendorAddress
      });
      truffleAssert.eventEmitted(tx, 'DeviceApproved', {
        payloadHash: payloadHash,
        sender: vendorAddress,
        source: gatewayAddress,
        target: deviceAddress
      });

      status = await RC.isTrustedDevice(deviceAddress, {
        from: observerAddress
      });
      assert.equal(status, true, "device address has been put into the trusted list");
    });
  });

  contract('#approveDevice() scenario 2', function (accounts) {
    const gatewayAddress = accounts[1];
    const vendorAddress = accounts[3];
    const deviceAddress = accounts[4];

    const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f123';
    let RC;

    beforeEach('deploy contract and store a valid payload', async function () {
      RC = await RegistryContract.new();

      // without gateway authentication and approval
      // device authentication
      await RC.storePayload(payloadHash, deviceAddress, vendorAddress, {
        from: gatewayAddress
      });
    });

    it('VENDOR can NOT approve the DEVICE due to invalid GATEWAY (not trusted GW)', async function () {
      // the gateway has not been validated yet, thereby it cannot validate a device
      await truffleAssert.reverts(
        RC.approveDevice(payloadHash, {
          from: vendorAddress
        }), 'gateway must be trusted'
      );
    });
  });
});