# Client Benchmarking #

This document elaborates how to measure the performance of the client when performing our access control scenarios.

## Setup ##

You need to have all of the entities up and running in each of the respective VMs.
We assume that you have successfully run all of our normal scenarios without issues.

Run the ethereum network and admin using the following command.
We assume that we are in `src` directory of `cd ~/border-chain/src`.

```shell
# in `actor1` VM, run ganache
npm run eth-network

# open another terminal in `actor1` VM, and run admin
npm run admin
```

## Running ##

We have three big scenarios.

### 1. Gateway Authentication ###

In this scenario, we want to measure the performance of the `owner` during gateway authentication request.
Run the following commands.
We assume that we are in `src` directory of `cd ~/border-chain/src`.

```shell
# in `actor4` VM, run isp
npm run isp

# in `actor2` VM, run the owner benchmark
npm run owner-client-benchmark
```

The result will be shown directly in the console.

### 2. Device Authentication ###

In this second scenario, we benchmark the `device` and `gateway` as clients of our device authentication procedure.
To do so, run the following commands.
We assume that we are in `src` directory of `cd ~/border-chain/src`.

```shell
# in `actor4` VM, run isp
npm run isp

# in `actor2` VM, run the owner
npm run owner

# in `actor6` VM, run the vendor
npm run vendor

# in `actor5` VM, run the gateway benchmark
npm run gateway-client-benchmark
# otherwise, run the normal gateway to benchmark the device
npm run gateway

# in `actor2` VM, run the device benchmark
npm run device-pksig-client-benchmark # for PK-SIG scenario
npm run device-sksig-client-benchmark # for SK-SIG scenario
npm run device-fingerprint-client-benchmark # for FINGERPRINTING scenario
npm run device-mac-client-benchmark # for MAC-ADDRESS scenario
```

Results will be shown directly in the console.

### 3. Access Authorization ###

In our final scenario, we benchmark the `iot-service` as clients of our access authorization, as well as, secure channel handshake procedures.
To do so, run the following commands.
We assume that we are in `src` directory of `cd ~/border-chain/src`.

```shell
# in `actor4` VM, run isp
npm run isp

# in `actor2` VM, run the owner
npm run owner

# in `actor6` VM, run the vendor
npm run vendor

# in `actor5` VM, run the gateway
npm run gateway

# in `actor7` VM, run the service benchmark
npm run service-client-benchmark-access # for access authorization
npm run service-client-benchmark-handshake # for secret key handshake
npm run service-client-benchmark-resource # for accessing resource using secret key
```

Results will be shown directly in the console.

**Note**: The result of the benchmark will vary depending on the host machines, where you perform the benchmark.
Moreover, our benchmark can leverage the multi CPUs that the machine has.
