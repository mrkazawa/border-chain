const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

/**
 * Gateway Authentication Test Scenario Part 3.
 * 
 * This test to verify the functionality of "revokeGateway" method
 * in the RegistryContract to provide anchoring service for 
 * Gateway Authentication in our IoT domain.
 * 
 * The Domain Owner will try to revoke the previously authorized gateway.
 * If revoked, then underlying device and granted access become invalid.
 */
//TODO: If gateway revoked, add test case for invalid access
describe('Gateway Authentication Part 3 -- Revoking Gateway Test', function () {
  contract('#revokeGateway() scenario 1', function (accounts) {
    const gatewayAddress = accounts[1];
    const ispAddress = accounts[2];
    const vendorAddress = accounts[3];
    const deviceAddress = accounts[4];
    const ownerAddress = accounts[6];
    const observerAddress = accounts[9];

    const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231';
    const devicePayloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f200';
    const routerIp = web3.utils.fromAscii("200.100.10.10");
    let RC;

    beforeEach('deploy contract, store payload, approve gateway', async function () {
      RC = await RegistryContract.new();
      await RC.storePayload(payloadHash, gatewayAddress, ispAddress, {
        from: ownerAddress
      });
      await RC.approveGateway(payloadHash, routerIp, {
        from: ispAddress
      });
    });

    it('DOMAIN OWNER can NOT revoke the GATEWAY due to invalid PAYLOAD (not exist)', async function () {
      const fakeHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f000';
      await truffleAssert.reverts(
        RC.revokeGateway(fakeHash, gatewayAddress, {
          from: ownerAddress
        }), 'payload must exist'
      );
    });

    it('DOMAIN OWNER can NOT revoke the GATEWAY due to already revoked', async function () {
      await RC.revokeGateway(payloadHash, gatewayAddress, {
        from: ownerAddress
      });
      // duplicate revocation
      await truffleAssert.reverts(
        RC.revokeGateway(payloadHash, gatewayAddress, {
          from: ownerAddress
        }), 'payload must be not revoked'
      );
    });

    it('OBSERVER can NOT revoke the GATEWAY due to invalid SOURCE (not authorized)', async function () {
      // an observer cannot arbitrarily revoke a gateway
      await truffleAssert.reverts(
        RC.revokeGateway(payloadHash, gatewayAddress, {
          from: observerAddress
        }), 'only for original source'
      );
    });

    it('DOMAIN OWNER can NOT revoke the GATEWAY due to invalid TARGET (gateway does not match)', async function () {
      // the gateway address does not match the target in the payload hash
      await truffleAssert.reverts(
        RC.revokeGateway(payloadHash, observerAddress, {
          from: ownerAddress
        }), 'payload must contain a valid target'
      );
    });

    it('DOMAIN OWNER can revoke the GATEWAY properly', async function () {
      await RC.storePayload(devicePayloadHash, deviceAddress, vendorAddress, {
        from: gatewayAddress
      });
      await RC.approveDevice(devicePayloadHash, {
        from: vendorAddress
      });

      let status = await RC.isTrustedGateway(gatewayAddress, {
        from: observerAddress
      });
      assert.equal(status, true, "gateway address has been put into the trusted list");
      status = await RC.isTrustedDevice(deviceAddress, {
        from: observerAddress
      });
      assert.equal(status, true, "device address has been put into the trusted list");

      const tx = await RC.revokeGateway(payloadHash, gatewayAddress, {
        from: ownerAddress
      });
      truffleAssert.eventEmitted(tx, 'GatewayRevoked', {
        payloadHash: payloadHash,
        sender: ownerAddress,
        gateway: gatewayAddress
      });

      // when we delete the trusted gateway, any associated device connected to the gateway should also be deleted, thereby not trusted
      status = await RC.isTrustedGateway(gatewayAddress, {
        from: observerAddress
      });
      assert.equal(status, false, "gateway address has been revokedt");
      status = await RC.isTrustedDevice(deviceAddress, {
        from: observerAddress
      });
      assert.equal(status, false, "device address is not trusted since the gateway is revoked");
    });
  });

  contract('#revokeDevice() scenario 2', function (accounts) {
    const gatewayAddress = accounts[1];
    const ispAddress = accounts[2];
    const ownerAddress = accounts[6];

    const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f123';
    let RC;

    beforeEach('deploy contract, gateway authentication without approval', async function () {
      RC = await RegistryContract.new();
      // gateway authentication
      await RC.storePayload(payloadHash, gatewayAddress, ispAddress, {
        from: ownerAddress
      });
      // without authentication approval
    });

    it('DOMAIN OWNER can NOT revoke the GATEWAY due to has not been approved yet', async function () {
      await truffleAssert.reverts(
        RC.revokeGateway(payloadHash, gatewayAddress, {
          from: ownerAddress
        }), 'payload must be approved'
      );
    });
  });
});