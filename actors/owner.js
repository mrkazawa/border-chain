const rp = require('request-promise-native');
const tools = require('./actor_tools');

async function main() {
    // setup parameters that are known by the owner.
    const ownerAddress = tools.getOwnerAddress();
    const ownerPrivateKey = tools.getOwnerPrivateKey();
    const ISPPublicKey = tools.getISPPublicKey();
    const ISPAddress = tools.getISPAddress();
    const gatewayAddress = tools.getGatewayAddress();

    // creating RegistryContract from deployed contract at the given address
    const RC = tools.constructSmartContract(tools.getContractABI(), tools.getContractAddress());

    // example of authentication payload for the ISP
    const auth = {
        routerIP: '200.100.10.10',
        username: 'john',
        password: 'fish',
        nonce: tools.randomValueBase64(32)
    };
    const authPayload = JSON.stringify(auth);
    const [authPayloadHash, authSignature, authEncryptedPayload] = await tools.encryptAndSignPayload(authPayload, ISPPublicKey, ownerPrivateKey);

    // sending transaction to register payload to the smart contract
    let tx = await RC.methods.storeAuthNPayload(authPayloadHash, gatewayAddress, ISPAddress).send({
        from: ownerAddress,
        gas: 1000000
    });
    if (typeof tx.events.NewPayloadAdded !== 'undefined') {
        const event = tx.events.NewPayloadAdded;
        if (event.returnValues['sender'] == ownerAddress &&
            event.returnValues['payloadHash'] == authPayloadHash) {
            console.log('transaction received by contract!');

            // sending authentication payload to the ISP
            let options = {
                method: 'POST',
                uri: tools.getISPAuthEndpoint(),
                body: {
                    authPayload: authEncryptedPayload,
                    authSignature: authSignature
                },
                resolveWithFullResponse: true,
                json: true // Automatically stringifies the body to JSON
            };
            rp(options).then(function (response) {
                if (response.statusCode == '200') {
                    console.log('success!');
                } else {
                    console.log('error!');
                }
                console.log(response.body);
            }).catch(function (err) {
                console.log(err);
            });
        } else {
            console.log('event values are wrong!');
        }
    } else {
        console.log('transaction failed!');
    }
}

main();