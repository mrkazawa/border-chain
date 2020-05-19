const rp = require('request-promise-native');
const tools = require('./actor_tools');

// setup parameters that are known by the owner.
const ownerAddress = tools.getOwnerAddress();
const ownerPrivateKey = tools.getOwnerPrivateKey();
const ISPPublicKey = tools.getISPPublicKey();
const ISPAddress = tools.getISPAddress();
const gatewayAddress = tools.getGatewayAddress();

// creating RegistryContract from deployed contract at the given address
const RC = tools.constructSmartContract(tools.getContractABI(), tools.getContractAddress());

async function main() {
    // example of authentication payload for the ISP
    const auth = {
        username: 'john',
        password: 'fish',
        routerIP: '200.100.10.10',
        nonce: tools.randomValueBase64(32)
    };
    const authPayload = JSON.stringify(auth);
    const authPayloadHash = tools.hashPayload(authPayload);

    // sending transaction to register payload to the smart contract
    let tx = await RC.methods.storeAuthNPayload(authPayloadHash, gatewayAddress, ISPAddress).send({
        from: ownerAddress,
        gas: 1000000
    });
    if (typeof tx.events.NewPayloadAdded !== 'undefined') {
        const event = tx.events.NewPayloadAdded;
        console.log('Tx stored in the block!');
        console.log('Storing Authn Tx from: ', event.returnValues['sender']);
        console.log('Authn payload: ', event.returnValues['payloadHash']);

        const authSignature = tools.signPayload(authPayloadHash, ownerPrivateKey);
        const payloadForISP = {
            authPayload: authPayload,
            authSignature: authSignature
        };
        const stringForISP = JSON.stringify(payloadForISP);
        const offChainPayload = await tools.encryptPayload(stringForISP, ISPPublicKey);

        // sending authentication payload to the ISP
        let options = {
            method: 'POST',
            uri: tools.getISPAuthnEndpoint(),
            body: {offChainPayload},
            resolveWithFullResponse: true,
            json: true // Automatically stringifies the body to JSON
        };
        rp(options).then(function (response) {
            console.log('Response status code: ', response.statusCode)
            console.log('Response body: ', response.body);
        }).catch(function (err) {
            console.log(err);
        });
    } else {
        console.log('cannot store auth payload Tx to blockchain!');
    }
}

main();