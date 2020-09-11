const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

/**
 * Device Authentication Test Scenario Part 3.
 * 
 * This test to verify the functionality of "revokeDevice" method
 * in the RegistryContract to provide anchoring service for 
 * Device Authentication in our IoT domain.
 * 
 * The Gateway will try to revoke the previously authorized device.
 */
describe('Device Authentication Part 3 -- Revoking Device Test', function () {
  contract('#revokeDevice() scenario 1', function (accounts) {
    const gatewayAddress = accounts[1];
    const ispAddress = accounts[2];
    const vendorAddress = accounts[3];
    const deviceAddress = accounts[4];
    const ownerAddress = accounts[6];
    const observerAddress = accounts[9];

    const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f200';
    let RC;

    beforeEach('deploy contract, store payloads, approve payloads', async function () {
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

      // device authentication and approval
      await RC.storePayload(payloadHash, deviceAddress, vendorAddress, {
        from: gatewayAddress
      });
      await RC.approveDevice(payloadHash, {
        from: vendorAddress
      });
    });

    it('GATEWAY can NOT revoke the DEVICE due to invalid PAYLOAD (not exist)', async function () {
      const fakeHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f000';
      await truffleAssert.reverts(
        RC.revokeDevice(fakeHash, deviceAddress, {
          from: gatewayAddress
        }), 'payload must exist'
      );
    });

    it('GATEWAY can NOT revoke the DEVICE due to already revoked', async function () {
      await RC.revokeDevice(payloadHash, deviceAddress, {
        from: gatewayAddress
      });
      // duplicate revocation
      await truffleAssert.reverts(
        RC.revokeDevice(payloadHash, deviceAddress, {
          from: gatewayAddress
        }), 'payload must be not revoked'
      );
    });

    it('OBSERVER can NOT revoke the DEVICE due to invalid SOURCE (not authorized)', async function () {
      // an observer cannot arbitrarily revoke a device
      await truffleAssert.reverts(
        RC.revokeDevice(payloadHash, deviceAddress, {
          from: observerAddress
        }), 'only for original source'
      );
    });

    it('GATEWAY can NOT revoke the DEVICE due to invalid TARGET (device does not match)', async function () {
      // the device address does not match the target in the payload hash
      await truffleAssert.reverts(
        RC.revokeDevice(payloadHash, observerAddress, {
          from: gatewayAddress
        }), 'payload must contain a valid target'
      );
    });

    it('GATEWAY can revoke the DEVICE properly', async function () {
      let status = await RC.isTrustedDevice(deviceAddress, {
        from: observerAddress
      });
      assert.equal(status, true, "device address has been put into the trusted list");

      const tx = await RC.revokeDevice(payloadHash, deviceAddress, {
        from: gatewayAddress
      });
      truffleAssert.eventEmitted(tx, 'DeviceRevoked', {
        payloadHash: payloadHash,
        sender: gatewayAddress,
        device: deviceAddress
      });

      status = await RC.isTrustedDevice(deviceAddress, {
        from: observerAddress
      });
      assert.equal(status, false, "device address has been revoked");
    });
  });

  contract('#revokeDevice() scenario 2', function (accounts) {
    const gatewayAddress = accounts[1];
    const ispAddress = accounts[2];
    const vendorAddress = accounts[3];
    const deviceAddress = accounts[4];
    const ownerAddress = accounts[6];

    const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f123';
    let RC;

    beforeEach('deploy contract, do gateway authentication and approval, store device payload without approval', async function () {
      RC = await RegistryContract.new();

      // gateway authentication and approval
      const gatewayPayloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91faaa';
      const routerIp = web3.utils.fromAscii("200.100.10.10");
      await RC.storePayload(gatewayPayloadHash, gatewayAddress, ispAddress, {
        from: ownerAddress
      });
      await RC.approveGateway(gatewayPayloadHash, routerIp, {
        from: ispAddress
      });

      // device authentication
      await RC.storePayload(payloadHash, deviceAddress, vendorAddress, {
        from: gatewayAddress
      });
      // without authentication approval
    });

    it('GATEWAY can NOT revoke the DEVICE due to DEVICE has not been approved yet', async function () {
      // the device has not been verified yet, therefore the device is not trusted
      await truffleAssert.reverts(
        RC.revokeDevice(payloadHash, deviceAddress, {
          from: gatewayAddress
        }), 'payload must be approved'
      );
    });
  });
});