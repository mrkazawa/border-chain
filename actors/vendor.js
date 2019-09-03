const express = require('express');
const tools = require('./actor_tools');

const app = express();
app.use(express.json());
app.use(function (err, req, res, next) {
    res.status(err.status || 500).json({
        status: err.status,
        message: err.message
    });
});

app.post('/authenticate', async (req, res) => {
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

    // setup parameters that are known by the owner.
    const ownerAddress = tools.getOwnerAddress();
    const ISPPrivateKey = tools.getISPPrivateKey();
    const ISPAddress = tools.getISPAddress();
    const gatewayAddress = tools.getGatewayAddress();

    // creating RegistryContract from deployed contract at the given address
    const RC = tools.constructSmartContract(tools.getContractABI(), tools.getContractAddress());

    const authPayloadHash = tools.hashPayload(req.body.authPayload);

    const payload = await RC.methods.getPayloadDetail(authPayloadHash).call({
        from: ISPAddress
    });

    // check if verifier is ISPAddress,
    // payload isValue is true,
    // payload isVerified is false
    if (payload[2] == ISPAddress && payload[3] && payload[4] == false) {
        const signerAddress = tools.recoverAddress(req.body.authSignature, authPayloadHash);

        if (signerAddress == ownerAddress) {
            const authString = await tools.decryptPayload(req.body.authPayload, ISPPrivateKey);
            const auth = JSON.parse(authString);

            if (auth.username == storedData.username &&
                auth.password == storedData.password &&
                auth.routerIP == storedData.routerIP) {

                // sending transaction to varify payload
                // with hash only should be enough
                const routerIP = tools.convertStringToByte(storedData.routerIP);
                let tx = await RC.methods.verifyAuthNGateway(authPayloadHash, routerIP).send({
                    from: ISPAddress
                });
                if (typeof tx.events.GatewayVerified !== 'undefined') {
                    const event = tx.events.GatewayVerified;
                    if (event.returnValues['sender'] == ISPAddress &&
                        event.returnValues['gateway'] == gatewayAddress) {
                        console.log('transaction received by contract!');

                        res.status(200).send('authentication attempt successful');
                    } else {
                        res.status(500).send('received wrong event from blockchain!');
                    }
                } else {
                    res.status(500).send('cannot verify to blockchain!');
                }
            } else {
                res.status(403).send('content does not match!!');
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
    console.log('Vendor Authentication Server is listening on port 4000!'),
);