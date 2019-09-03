const rp = require('request-promise-native');
const tools = require('./actor_tools');

async function main() {
    // setup parameters that are known by the device.
    const devicePrivateKey = tools.getDevicePrivateKey();
    const vendorPublicKey = tools.getVendorPublicKey();
    const vendorID = "samsung";

    // example of authentication payload for the vendor
    const authForVendor = {
        deviceSN: 'serial_number_1234'
    }
    const authPayload = JSON.stringify(authForVendor);
    const [authSignature, authEncryptedPayload] = await tools.encryptAndSignPayload(authPayload, vendorPublicKey, devicePrivateKey);

    // sending authentication payload to the gateway
    let options = {
        method: 'POST',
        uri: tools.getGatewayAuthnEndpoint(),
        body: {
            deviceUUID: tools.getDeviceAddress(), // we use Eth address for UUID
            authEncryptedPayload: authEncryptedPayload,
            authSignature: authSignature,
            vendorID: vendorID,
            nonce: tools.randomValueBase64(32) // to protect replay at gateway
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