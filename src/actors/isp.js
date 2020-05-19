const express = require('express');
const tools = require('./actor_tools');

/**
 * our mock of users data stored in the ISP
 * in real life, this data is collected by ISP during users
 * registration and then stored in database.
 */
const storedData = {
    routerIP: '200.100.10.10',
    username: 'john',
    password: 'fish'
};

// setup parameters that are known by the ISP.
const ISPPrivateKey = tools.getISPPrivateKey();
const ISPAddress = tools.getISPAddress();

// creating RegistryContract from deployed contract at the given address
const RC = tools.constructSmartContract(tools.getContractABI(), tools.getContractAddress());

const app = express();
app.use(express.json());

app.post('/authenticate', async (req, res) => {
    // get the payload from the http request
    const offChainPayload = req.body.offChainPayload;

    const stringForISP = await tools.decryptPayload(offChainPayload, ISPPrivateKey);
    const payloadForISP = JSON.parse(stringForISP);
    const authPayloadHash = tools.hashPayload(payloadForISP.authPayload);
    const payload = await RC.methods.getPayloadDetail(authPayloadHash).call({
        from: ISPAddress
    });
    // check if verifier is ISPAddress,
    // payload isValue is true,
    // payload isVerified is false
    if (payload[2] == ISPAddress && payload[3] && !payload[4]) {
        const signerAddress = tools.recoverAddress(payloadForISP.authSignature, authPayloadHash);
        // check if the signature is sign by the source of payload
        if (signerAddress == payload[0]) {
            const auth = JSON.parse(payloadForISP.authPayload);

            // TODO: checking auth.nonce in real production with database connection
            // check if username & password exist in the database
            // also chedk if the IP of the user is correct
            if (auth.username == storedData.username &&
                auth.password == storedData.password &&
                auth.routerIP == storedData.routerIP) {

                const routerIP = tools.convertStringToByte(storedData.routerIP);
                let tx = await RC.methods.verifyAuthNGateway(authPayloadHash, routerIP).send({
                    from: ISPAddress
                });
                if (typeof tx.events.GatewayVerified !== 'undefined') {
                    const event = tx.events.GatewayVerified;
                    console.log('Tx stored in the block!');
                    console.log('Verify Authn Tx from: ', event.returnValues['sender']);
                    console.log('Authn for: ', event.returnValues['gateway']);

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
app.listen(3000, () =>
    console.log('ISP Authentication Server is listening on port 3000!'),
);