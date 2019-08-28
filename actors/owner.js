const EthCrypto = require('eth-crypto');
const fs = require('fs');

const credentialsPath = './actors/owner-credntials.json';

async function main() {
    var owner;

    try {
        await fs.promises.access(credentialsPath);
        let data = fs.readFileSync(credentialsPath, 'utf8');
        owner = JSON.parse(data);
    } catch (error) {
        // the credentials json does not exist
        owner = EthCrypto.createIdentity();
        let json = JSON.stringify(owner);
        await fs.writeFileSync(credentialsPath, json, 'utf8');
    }
    
    console.log(owner);
}

main();