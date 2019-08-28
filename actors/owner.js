const EthCrypto = require('eth-crypto');
const fs = require('fs');
const ipfsClient = require('ipfs-http-client');

const tools = require('./actor_tools');

const credentialsPath = './actors/owner-credntials.json';

async function main() {
    var owner;
    var key = tools.randomValueBase64(32);
    var routerIP = '200.100.10.10';
    var username = 'john';
    var password = 'fish';

    try {
        await fs.promises.access(credentialsPath);
        let data = fs.readFileSync(credentialsPath, 'utf8');
        owner = JSON.parse(data);
    } catch (error) {
        // the credentials json does not exist
        owner = EthCrypto.createIdentity();
        let json = JSON.stringify(owner);
        fs.writeFileSync(credentialsPath, json, 'utf8');
    }

    let payload = {
        routerIP:routerIP,
        username:username,
        password:password
    };
    let encryptedPayload = tools.encryptSymmetrically(key, JSON.stringify(payload));
    
    console.log(encryptedPayload);

    let decryptedPayload = tools.decryptSymmetrically(key, encryptedPayload);

    console.log(decryptedPayload);
}

main();