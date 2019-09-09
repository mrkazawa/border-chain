const express = require('express');
const rp = require('request-promise-native');
const tools = require('./actor_tools');

/**
 * our mock of vendor ID to eth address mapping.
 * the gateway maintains this mapping in production.
 */
const vendorMapping = {
    'samsung': {
        'address': tools.getVendorAddress()
    },
    'lg': {
        'address': '0x0000abc'
    }
};

// setup parameters that are known by the gateway.
const gatewayPrivateKey = tools.getGatewayPrivateKey();
const gatewayAddress = tools.getGatewayAddress();
// creating RegistryContract from deployed contract at the given address
const RC = tools.constructSmartContract(tools.getContractABI(), tools.getContractAddress());

const app = express();
app.use(express.json());

app.post('/authenticate', async (req, res) => {
    // get the payload from the http request
    const offChainPayload = req.body.offChainPayload;
    const authPayloadHash = req.body.authPayloadHash;
    const deviceID = req.body.deviceID;
    const vendorID = req.body.vendorID;
    const nonce = req.body.nonce;

    // TODO: check the nonce
    if (typeof vendorMapping[vendorID] !== 'undefined') {
        let vendorAddress = vendorMapping[vendorID].address;

        // sending transaction to register payload to the smart contract
        let tx = await RC.methods.storeAuthNPayload(authPayloadHash, deviceID, vendorAddress).send({
            from: gatewayAddress,
            gas: 1000000
        });
        if (typeof tx.events.NewPayloadAdded !== 'undefined') {
            const event = tx.events.NewPayloadAdded;
            console.log('Tx stored in the block!');
            console.log('Storing Authn Tx from: ', event.returnValues['sender']);
            console.log('Authn payload: ', event.returnValues['payloadHash']);

            // sending authentication payload to the vendor
            let options = {
                method: 'POST',
                uri: tools.getVendorAuthnEndpoint(),
                body: {offChainPayload},
                resolveWithFullResponse: true,
                json: true // Automatically stringifies the body to JSON
            };
            rp(options).then(function (response) {
                console.log('Response status code: ', response.statusCode)
                console.log('Response body: ', response.body);
                if (response.statusCode == '200') {
                    res.status(200).send('authentication attempt successful');
                } else {
                    res.status(403).send(response.body);
                }
            }).catch(function (err) {
                console.log(err);
                res.status(500).send(err);
            });
        } else {
            res.status(500).send('cannot store auth payload Tx to blockchain!');
        }
    } else {
        res.status(404).send('vendor ID is not found!');
    }
});

// main
app.listen(5000, () =>
    console.log('Gateway Server is listening on port 5000!'),
);