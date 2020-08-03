const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

/**
 * Service Authorization Test Scenario Part 3.
 * 
 * This test to verify the functionality of "revokeAccess" method
 * in the RegistryContract to provide anchoring service for authorization
 * in our IoT domain.
 * 
 * The Service and Gateway will try to revoke the previously authorized access
 * that is given to the Service.
 */
describe('Service Authorization Part 3 -- Revoking Access Test', function () {
  contract('#revokeAccess() scenario 1', function (accounts) {
    const gatewayAddress = accounts[1];
    const serviceAddress = accounts[2];
    const ispAddress = accounts[3];
    const ownerAddress = accounts[4];
    const observerAddress = accounts[9];

    const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231';
    let RC;

    beforeEach('deploy contract, store valid payloads, approve access', async function () {
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

      // access authorization and approval
      const expiredIn = 3600;
      await RC.storePayload(payloadHash, serviceAddress, gatewayAddress, {
        from: serviceAddress
      });
      await RC.approveAccess(payloadHash, expiredIn, {
        from: gatewayAddress
      });
    });

    it('GATEWAY can NOT revoke the ACCESS due to invalid PAYLOAD (not exist)', async function () {
      const fakeHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f000';
      await truffleAssert.reverts(
        RC.revokeAccess(fakeHash, {
          from: gatewayAddress
        }), 'payload must exist'
      );
    });

    it('SERVICE can NOT revoke the ACCESS due to invalid PAYLOAD (not exist)', async function () {
      const fakeHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f000';
      await truffleAssert.reverts(
        RC.revokeAccess(fakeHash, {
          from: serviceAddress
        }), 'payload must exist'
      );
    });

    it('GATEWAY can NOT revoke the ACCESS due to ACCESS already revoked', async function () {
      await RC.revokeAccess(payloadHash, {
        from: gatewayAddress
      });
      // double revoke
      await truffleAssert.reverts(
        RC.revokeAccess(payloadHash, {
          from: gatewayAddress
        }), 'payload must be not revoked'
      );
    });

    it('SERVICE can NOT revoke the ACCESS due to ACCESS already revoked', async function () {
      await RC.revokeAccess(payloadHash, {
        from: serviceAddress
      });
      // double revoke
      await truffleAssert.reverts(
        RC.revokeAccess(payloadHash, {
          from: serviceAddress
        }), 'payload must be not revoked'
      );
    });

    it('OBSERVER can NOT revoke the ACCESS due to invalid SOURCE (not authorized)', async function () {
      // an observer cannot arbitrarily revoke an access
      await truffleAssert.reverts(
        RC.revokeAccess(payloadHash, {
          from: observerAddress
        }), 'only for original source'
      );
    });

    it('GATEWAY can revoke the ACCESS properly', async function () {
      const tx = await RC.revokeAccess(payloadHash, {
        from: gatewayAddress
      });
      truffleAssert.eventEmitted(tx, 'AccessRevoked', {
        payloadHash: payloadHash,
        sender: gatewayAddress,
        target: serviceAddress
      });
    });

    it('SERVICE can revoke the ACCESS properly', async function () {
      const tx = await RC.revokeAccess(payloadHash, {
        from: serviceAddress
      });
      truffleAssert.eventEmitted(tx, 'AccessRevoked', {
        payloadHash: payloadHash,
        sender: serviceAddress,
        target: serviceAddress
      });
    });
  });

  contract('#revokeAccess() scenario 2', function (accounts) {
    const gatewayAddress = accounts[1];
    const serviceAddress = accounts[2];
    const ispAddress = accounts[3];
    const ownerAddress = accounts[4];

    const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f123';
    let RC;

    beforeEach('deploy contract, do gateway authentication and approval, store authorization payload without approval', async function () {
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

      // access authorization
      await RC.storePayload(payloadHash, serviceAddress, gatewayAddress, {
        from: serviceAddress
      });
      // without authorization approval
    });

    it('GATEWAY can NOT revoke the DEVICE due to ACCESS has not been approved yet', async function () {
      await truffleAssert.reverts(
        RC.revokeAccess(payloadHash, {
          from: gatewayAddress
        }), 'payload must be approved'
      );
    });

    it('SERVICE can NOT revoke the DEVICE due to ACCESS has not been approved yet', async function () {
      await truffleAssert.reverts(
        RC.revokeAccess(payloadHash, {
          from: serviceAddress
        }), 'payload must be approved'
      );
    });
  });
});