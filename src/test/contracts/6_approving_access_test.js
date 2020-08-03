const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

/**
 * Service Authorization Test Scenario Part 2.
 * 
 * This test to verify the functionality of "approveAccess" method
 * in the RegistryContract to provide anchoring service for authorization
 * in our IoT domain.
 * 
 * The Gateway will approve the access request from the Service
 * if all of requirements are valid.
 */
describe('Service Authorization Part 2 -- Approving Access Test', function () {
  contract('#approveAccess() scenario 1', function (accounts) {
    const gatewayAddress = accounts[1];
    const serviceAddress = accounts[2];
    const ispAddress = accounts[3];
    const ownerAddress = accounts[4];
    const observerAddress = accounts[9];

    const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231';
    const expiredIn = 3600;
    let RC;

    beforeEach('deploy contract and store a valid payload', async function () {
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
    });

    it('GATEWAY can NOT approve the SERVICE due to invalid PAYLOAD (not exist)', async function () {
      const fakeHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f000';
      await truffleAssert.reverts(
        RC.approveAccess(fakeHash, expiredIn, {
          from: gatewayAddress
        }), 'payload must exist'
      );
    });

    it('GATEWAY can NOT approve the SERVICE due to invalid PAYLOAD (already approved)', async function () {
      await RC.approveAccess(payloadHash, expiredIn, {
        from: gatewayAddress
      });
      // duplicate approval is not allowed
      await truffleAssert.reverts(
        RC.approveAccess(payloadHash, expiredIn, {
          from: gatewayAddress
        }), 'payload must be not approved'
      );
    });

    it('OBSERVER can NOT approve the SERVICE due to invalid APPROVER (not authorized)', async function () {
      // an observer cannot arbitrarily approve a payload
      await truffleAssert.reverts(
        RC.approveAccess(payloadHash, expiredIn, {
          from: observerAddress
        }), 'only for original approver'
      );
    });

    it('GATEWAY can approve the SERVICE correctly', async function () {
      const blockNumber = await web3.eth.getBlockNumber();
      const block = await web3.eth.getBlock(blockNumber);
      const timestamp = block.timestamp;
      const expiryTime = timestamp + expiredIn;

      const tx = await RC.approveAccess(payloadHash, expiredIn, {
        from: gatewayAddress
      });
      truffleAssert.eventEmitted(tx, 'AccessApproved', (ev) => {
        return (
          ev.payloadHash == payloadHash &&
          ev.sender == gatewayAddress &&
          ev.target == serviceAddress &&
          ev.expiryTime == expiryTime
        );
      });
    });
  });

  contract('#approveAccess() scenario 2', function (accounts) {
    const gatewayAddress = accounts[1];
    const serviceAddress = accounts[2];

    const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f123';
    const expiryTime = 3600;
    let RC;

    beforeEach('deploy contract and store a valid payload', async function () {
      RC = await RegistryContract.new();

      // without gateway authentication and approval
      // access authorization
      await RC.storePayload(payloadHash, serviceAddress, gatewayAddress, {
        from: serviceAddress
      });
    });

    it('GATEWAY can NOT approve the SERVICE due to GATEWAY has not been approved yet', async function () {
      // the gateway has not been approved
      await truffleAssert.reverts(
        RC.approveAccess(payloadHash, expiryTime, {
          from: gatewayAddress
        }), 'gateway must be trusted'
      );
    });
  });
});