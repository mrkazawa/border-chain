# Cryptographic Tools Benchmarking #

This document details how to benchmark the cryptographic tools that we use in this project.

## Cryptographic Libraries ##

We use the following crypto tools:

- For blockchain-related stuffs, we use [eth-crypto](https://www.npmjs.com/package/eth-crypto).
- For non-blockchain-related things, we employ [node-js-crypto](https://nodejs.org/docs/latest-v10.x/api/crypto.html).

## Running Benchmark ##

We have several benchmarking scenarios.

1. Benchmark the `hash`, which generates KECCAK-256 hash using `eth-crypto` module.
2. Benchmark the `pk-sign`, which is the public key signaturing using ECDSA of `eth-crypto` module.
3. Benchmark the `pk-verify`, verifies an ECDSA signature of `eth-crypto` module.
4. Benchmark the `sk-sign`, produces a HMAC signature using `node-js-crypto` module.
5. Benchmark the `sk-verify`, which validates an HMAC signature of `node-js-crypto` module.
6. Benchmark the `pk-encrypt`, public key encryption using `eth-crypto` module.
7. Benchmark the `pk-decrypt`, decrypts public key encryption payload of `eth-crypto` module.
8. Benchmark the `sk-encrypt`, AES-256 symmetric encryption using `node-js-crypto` module.
9. Benchmark the `sk-decrypt`, which decrypts the AES-256 encrypted payload of `node-js-crypto` module.

First, we run the `benchmark-server`.
The server is based on [express](https://www.npmjs.com/package/express) module.

```console
# open new terminal
vagrant@actor4:~$ cd ~/src
vagrant@actor4:~$ node benchmark/crypto/server.js
```

Then, in another machine, run the `benchmark-client`.
We need to configure the `client.js` file to match the IP location of the `benchmark-server`.

```javascript
const SERVER_HOSTNAME = 'actor4.local';
const SERVER_PORT = 3000;
```

Then, run the [autocannon](https://www.npmjs.com/package/autocannon) instance.

```console
# open new terminal
vagrant@actor3:~$ cd ~/src
vagrant@actor3:~$ bash benchmark/crypto/run.sh 1 5 # to run hash operation for 5 iterations
vagrant@actor3:~$ bash benchmark/crypto/run.sh 2 15 # to run pk-sign operation for 15 iterations
vagrant@actor3:~$ bash benchmark/crypto/run.sh 3 15 # to run pk-verify operation for 15 iterations
vagrant@actor3:~$ bash benchmark/crypto/run.sh 4 15 # to run sk-sign operation for 15 iterations
vagrant@actor3:~$ bash benchmark/crypto/run.sh 5 15 # to run sk-verify operation for 15 iterations
vagrant@actor3:~$ bash benchmark/crypto/run.sh 6 10 # to run pk-encrypt operation for 10 iterations
vagrant@actor3:~$ bash benchmark/crypto/run.sh 7 10 # to run pk-decrypt operation for 10 iterations
vagrant@actor3:~$ bash benchmark/crypto/run.sh 8 10 # to run sk-encrypt operation for 10 iterations
vagrant@actor3:~$ bash benchmark/crypto/run.sh 9 10 # to run sk-decrypt operation for 10 iterations
```

We can get the benchmark result from the `result.csv` file.

```console
vagrant@actor3:~$ cd ~/src
vagrant@actor3:~$ cat result.csv
```

**Note**: The result of the benchmark will vary depending on the host machines, where you perform the benchmark.
Moreover, our benchmark can leverage the multi CPUs that the guest machines have.
