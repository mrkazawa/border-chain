# Benchmarking #

The purpose of this document is to guide how to perform benchmarking for this project.

## Installation ##

You can clone and install the project from the repository.
The result of the benchmark will vary depending on the host machines.
Depending on the case, it can leverage the multi CPUs that the machine has.

## Running ##

We have several benchmarking scenarios.

- Benchmark the capability of the [eth-crypto](https://www.npmjs.com/package/eth-crypto) crypto module that we use in this project.
- Benchmark several approach to test [express](https://www.npmjs.com/package/express) web-server.
- Stress test our implementation of the ISP authentication server.
- Stress test our implementation of the Vendor authentication server.
- Stress test our implementation of the Gateway authorization server.

### 1. The Eth-crypto Benchmark ###

First, determine if single or multi-thread

Assign the bench-tool.js

Run the etherum network and deploy the smart contract

Run the benchmark.

### 2. The Express Server Benchmark ###

### 3. ISP Authentication Server Benchmark ###

### 4. Vendor Authentication Server Benchmark ###

### 5. Gateway Authorization Server Benchmark ###
