const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const privateKey = '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318';
const address = '0x2c7536E3605D9C16a7a3D7b1898e529396a65c23';

describe('Unit tests for crypto module built-in WEB3', function () {
  it('should able to check web3 version', async () => {
    assert.notEqual(web3.version, null);
  });

  it('should generate eth address from private key', async () => {
    let account = web3.eth.accounts.privateKeyToAccount(privateKey);
    assert.equal(account.address, address);
    assert.equal(account.privateKey, privateKey);
  });

  it('should hash properly', async () => {
    let hash = web3.eth.accounts.hashMessage('Some data');
    assert.equal(hash, '0x1da44b586eb0729ff70a73c326926f6ed5a25f5b056e7f47fbc6e58d86871655');
  });

  it('should sign properly', async () => {
    let m = web3.eth.accounts.sign('Some data', privateKey);
    assert.equal(m.message, 'Some data');
    assert.equal(m.messageHash, '0x1da44b586eb0729ff70a73c326926f6ed5a25f5b056e7f47fbc6e58d86871655');
    assert.equal(m.v, '0x1c');
    assert.equal(m.r, '0xb91467e570a6466aa9e9876cbcd013baba02900b8979d43fe208a4a4f339f5fd');
    assert.equal(m.s, '0x6007e74cd82e037b800186422fc2da167c747ef045e5d18a5f5d4300f8e1a029');
    assert.equal(m.signature, '0xb91467e570a6466aa9e9876cbcd013baba02900b8979d43fe208a4a4f339f5fd6007e74cd82e037b800186422fc2da167c747ef045e5d18a5f5d4300f8e1a0291c');
  });

  it('should verify signature and get the address with OBJECT (HASH, V, R, S)', async () => {
    let addr = web3.eth.accounts.recover({
      messageHash: '0x1da44b586eb0729ff70a73c326926f6ed5a25f5b056e7f47fbc6e58d86871655',
      v: '0x1c',
      r: '0xb91467e570a6466aa9e9876cbcd013baba02900b8979d43fe208a4a4f339f5fd',
      s: '0x6007e74cd82e037b800186422fc2da167c747ef045e5d18a5f5d4300f8e1a029'
    });
    assert.equal(addr, address);
  });

  it('should verify signature and get the address with DATA, SIGNATURE', async () => {
    let addr = web3.eth.accounts.recover(
      'Some data',
      '0xb91467e570a6466aa9e9876cbcd013baba02900b8979d43fe208a4a4f339f5fd6007e74cd82e037b800186422fc2da167c747ef045e5d18a5f5d4300f8e1a0291c'
    );
    assert.equal(addr, address);
  });

  it('should verify signature and get the address with DATA, V, R, S', async () => {
    let addr = web3.eth.accounts.recover(
      'Some data',
      '0x1c',
      '0xb91467e570a6466aa9e9876cbcd013baba02900b8979d43fe208a4a4f339f5fd',
      '0x6007e74cd82e037b800186422fc2da167c747ef045e5d18a5f5d4300f8e1a029'
    );
    assert.equal(addr, address);
  });

  it('should verify INVALID signature with OBJECT (HASH, V, R, S)', async () => {
    let m = web3.eth.accounts.sign('Some data', privateKey);
    let fakeHash = web3.eth.accounts.hashMessage('fake data');
    // attacker modify the data and use the valid or captured signature
    let addr = web3.eth.accounts.recover({
      messageHash: fakeHash,
      v: m.v,
      r: m.r,
      s: m.s
    });
    assert.notEqual(addr, address);
  });

  it('should verify INVALID signature with DATA, SIGNATURE', async () => {
    let m = web3.eth.accounts.sign('Some data', privateKey);
    // attacker modify the data and use the valid or captured signature
    let addr = web3.eth.accounts.recover('fake data', m.signature);
    assert.notEqual(addr, address);
  });

  it('should verify INVALID signature with DATA, V, R, S', async () => {
    let m = web3.eth.accounts.sign('Some data', privateKey);
    // attacker modify the data and use the valid or captured v,r,s
    let addr = web3.eth.accounts.recover('fake data', m.v, m.r, m.s);
    assert.notEqual(addr, address);
  });
});