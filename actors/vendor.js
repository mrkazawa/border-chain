const express = require('express');
const tools = require('./actor_tools');

/**
 * our mock of devices data stored in the vendor
 * in real life, this data is collected by vendor during devices'
 * manufacturing and then stored in database.
 */
const storedData = {
    deviceID: tools.getDeviceAddress(),
    deviceSN: 'serial_number_1234'
};
// setup parameters that are known by the vendor.
const vendorPrivateKey = tools.getVendorPrivateKey();
const vendorAddress = tools.getVendorAddress();
// creating RegistryContract from deployed contract at the given address
const RC = tools.constructSmartContract(tools.getContractABI(), tools.getContractAddress());

const app = express();
app.use(express.json());

app.post('/authenticate', async (req, res) => {
    // get the payload from the http request
    const offChainPayload = req.body.offChainPayload;

    const stringForVendor = await tools.decryptPayload(offChainPayload, vendorPrivateKey);
    const payloadForVendor = JSON.parse(stringForVendor);
    const authPayloadHash = tools.hashPayload(payloadForVendor.authPayload);
    const payload = await RC.methods.getPayloadDetail(authPayloadHash).call({
        from: vendorAddress
    });
    // check if verifier is vendorAddress,
    // payload isValue is true,
    // payload isVerified is false
    if (payload[2] == vendorAddress && payload[3] && !payload[4]) {
        const signerAddress = tools.recoverAddress(payloadForVendor.authSignature, authPayloadHash);
        // check if the signature is sign by the target of payload
        if (signerAddress == payload[1]) {
            const auth = JSON.parse(payloadForVendor.authPayload);
            // TODO: checking auth.nonce in real production with database connection
            // check if serial number is correct
            if (auth.deviceSN == storedData.deviceSN) {
                // sending transaction to varify payload
                let tx = await RC.methods.verifyAuthNDevice(authPayloadHash).send({
                    from: vendorAddress
                });
                if (typeof tx.events.DeviceVerified !== 'undefined') {
                    const event = tx.events.DeviceVerified;
                    console.log('Tx stored in the block!');
                    console.log('Verify Authn Tx from: ', event.returnValues['sender']);
                    console.log('Authn for GW: ', event.returnValues['gateway']);
                    console.log('Authn for device: ', event.returnValues['device']);

                    res.status(200).send('authentication attempt successful');
                } else {
                    res.status(500).send('cannot store verify Tx to blockchain!');
                }
            } else {
                res.status(403).send('auth content does not match!!');
            }
        } else {
            res.status(403).send('signature does not match!');
        }
    } else {
        res.status(404).send('payload not found!');
    }
});

// main
app.listen(4000, () =>
    console.log('Vendor Authentication Server is listening on port 4000!'),
);