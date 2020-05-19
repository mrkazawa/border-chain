const rp = require('request-promise-native');
const tools = require('./actor_tools');

// setup parameters that are known by the device.
const devicePrivateKey = tools.getDevicePrivateKey();
const vendorPublicKey = tools.getVendorPublicKey();

async function main() {
    // example of authentication payload for the vendor
    const auth = {
        deviceSN: 'serial_number_1234', // a mock device serial number
        nonce: tools.randomValueBase64(16)
    }
    const authPayload = JSON.stringify(auth);
    const authPayloadHash = tools.hashPayload(authPayload);
    const authSignature = tools.signPayload(authPayloadHash, devicePrivateKey);
    const payloadForVendor = {
        authPayload: authPayload,
        authSignature: authSignature
    }
    const stringForVendor = JSON.stringify(payloadForVendor);
    const offChainPayload = await tools.encryptPayload(stringForVendor, vendorPublicKey);

    // sending authentication payload to the gateway
    let options = {
        method: 'POST',
        uri: tools.getGatewayAuthnEndpoint(),
        body: {
            offChainPayload: offChainPayload,
            authPayloadHash: authPayloadHash,
            vendorID: "samsung", // a mock vendor id
            deviceID: tools.getDeviceAddress(), // we use Eth address for UUID
            nonce: tools.randomValueBase64(16) // to protect replay at gateway
        },
        resolveWithFullResponse: true,
        json: true // Automatically stringifies the body to JSON
    };
    rp(options).then(function (response) {
        console.log('Response status code: ', response.statusCode)
        console.log('Response body: ', response.body);
    }).catch(function (err) {
        console.log(err);
    });
}

main();