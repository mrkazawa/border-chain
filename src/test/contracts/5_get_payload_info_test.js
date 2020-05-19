const RegistryContract = artifacts.require("RegistryContract");

contract('Get Payload Detail Test', (accounts) => {
  const gatewayAddress = accounts[1];
  const ISPAddress = accounts[2];
  const ownerAddress = accounts[6];
  const observerAddress = accounts[9];

  const payloadHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231';
  let RC;

  beforeEach('deploy contract and store a valid payload', async () => {
    RC = await RegistryContract.new();
    await RC.storeAuthNPayload(payloadHash, gatewayAddress, ISPAddress, {
      from: ownerAddress
    });
  });

  it('OBSERVER can query FAKE or VALID PAYLOAD', async () => {
    const fakeHash = '0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f000';
    let payload = await RC.getPayloadDetail(fakeHash, {
      from: observerAddress
    });
    // below is the default value for unknown hash
    assert.equal(payload[0], 0, "source");
    assert.equal(payload[1], 0, "target");
    assert.equal(payload[2], 0, "verifier");
    assert.equal(payload[3], false, "isValid");
    assert.equal(payload[4], false, "isVerified");

    payload = await RC.getPayloadDetail(payloadHash, {
      from: observerAddress
    });
    assert.equal(payload[0], ownerAddress, "source");
    assert.equal(payload[1], gatewayAddress, "target");
    assert.equal(payload[2], ISPAddress, "verifier");
    assert.equal(payload[3], true, "isValid");
    assert.equal(payload[4], false, "isVerified");
  });
});