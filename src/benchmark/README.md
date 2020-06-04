# Benchmarking #

The purpose of this document is to guide how to perform benchmarking for this project.

## Installation ##

You can clone and install the project from the repository.
The result of the benchmark will vary depending on the host machines, where you perform the benchmark.
Moreover, depending on the resources that you have, it can leverage the multi CPUs that the machine has.

## Running ##

We have several benchmarking scenarios.

- Benchmark the capability of the [eth-crypto](https://www.npmjs.com/package/eth-crypto) crypto module that we use in this project.
- Benchmark several approach to test [express](https://www.npmjs.com/package/express) web-server.
- Stress test our implementation of the ISP authentication server.
- Stress test our implementation of the Vendor authentication server.
- Stress test our implementation of the Gateway authorization server.

### 1. The Eth-crypto Benchmark ###

In this first scenario, we will stress test the performance of `eth-crypto`, our crypto library that we use in this project.
We have the benchmark configuration in the `bench-tool.js`.
You can change these two variables according to your need.

```javascript
/**
 * How many times we do the performed operations.
 * Whether it is sign, verify, encrypt, and decrypt payload, or sign a transaction.
 */
const NUMBER_OF_EPOCH = 100000;

/**
 * This is the custom javascript object that we use as the fake payload.
 * The bigger the object is going to affect the performance.
 */
const createFakeIspPayload = function () {
  return {
    username: 'john',
    password: 'fish',
    routerIP: '200.100.10.10',
    nonce: CryptoUtil.randomValueBase64(64)
  };
}
```

We have two versions, single or multi-thread version.
We also have two arguments.

The first argument is the mode of operations to be performed by `eth-crypto` .
We have five operations, identified by their code numbers (1-5) as follows:

1. *Sign Payload*, sign a given payload.
2. *Verify Payload*, verify a given signature and address.
3. *Encrypt Payload*, encrypt a given plaintext payload.
4. *Decrypt Payload*, decrupt a given ciphertext payload.
5. *Sign Transaction*, sign an Ethereum transaction.

The second argument is how many times you want to run the operation.
Note that it is not the number of iteration.
It is an additional counter after the iteration.

For example, given the following command.

```shell
# for single core
bash benchmark/single/run.sh 1 1
# for multi core
bash benchmark/worker-farm/run.sh 4 3
```

The first command will run the *Sign Payload* operation for `100000` iterations for `1` times in single thread.
Meanwhile, the second command will run the *Decrypt Payload* operation for `100000` iterations for `3` times in multi threads.
After running those commands, the system will display the result in the console.
It also saves the result in csv files.

```shell
cat sign-payload.csv
cat decrypt-payload.csv
```

### 2. The Express Server Benchmark ###

In our second scenario, we will test the performance of `express`, the web framework that we use.
We also include some code of `eth-crypto` to measure the performance when we integrate it to the web server.
We have seven scenarios.

1. Run simple server that will return an a success HTTP 200 message.
2. Run a server that parse JSON body using `body-parser`.
3. Run a server that parse JSON, then decrypt the payload in single thread way.
4. Run a server that parse JSON, then decrypt the payload in multi-thread way.
5. Run a server that parse JSON, then decrypt and verify the payload in multi-thread way.
6. Run a server that parse JSON, then decrypt the payload using cluster module.
7. Run a server that parse JSON, then decrypt and verify the payload using cluster module.

To perform the benchmark, run the following commands:

```bash
cd ~/src/benchmark/express/

# first we need to run the server
# we need to choose one of the seven scenarios that we mentioned previously.
node 1-simple-server
node 2-get-param-server
node 3-decrypt-single-server
node 4-decrypt-multi-server
node 5-combined-server
node 6-decrypt-cluster
node 7-combined-cluster

# open another terminal
# then we run the autocannon client to bench the server
# make sure to change the URL in bench-client.js correctly
node bench-client
```

The benchmark result will be reported in the console.

### 3. ISP Authentication Server Benchmark ###

### 4. Vendor Authentication Server Benchmark ###

### 5. Gateway Authorization Server Benchmark ###
