# Client Benchmarking #

This document elaborates on how to measure the performance of the client when performing our access control scenarios.

## Setup ##

You need to have all of the entities up and running in each of the respective VMs.
We assume that you have successfully run all of our standard scenarios, described [here](https://github.com/mrkazawa/border-chain/blob/master/README.md), without any issues.

Run the ethereum network and admin using the following command.

```console
# open new terminal
vagrant@actor1:~$ cd ~/src
vagrant@actor1:~$ npm run eth-network # run ganache

# open a new terminal
vagrant@actor1:~$ cd ~/src
vagrant@actor1:~$ npm run admin
```

## Running Benchmark ##

We have three client benchmarking scenarios.

### 1. Gateway Authentication ###

In this scenario, we want to measure the `owner` performance during the gateway authentication request.
Run the following commands.

```console
# open new terminal
vagrant@actor4:~$ cd ~/src
vagrant@actor4:~$ npm run isp

# open new terminal
vagrant@actor2:~$ cd ~/src
vagrant@actor2:~$ npm run owner-client-benchmark
```

The result will be shown directly in the console.

### 2. Device Authentication ###

In this second scenario, we benchmark the `device` and `gateway` as clients of our device authentication procedure.
To do so, run the following commands.

```console
# open new terminal
vagrant@actor4:~$ cd ~/src
vagrant@actor4:~$ npm run isp

# open a new terminal
vagrant@actor2:~$ cd ~/src
vagrant@actor2:~$ npm run owner

# open a new terminal
vagrant@actor6:~$ cd ~/src
vagrant@actor6:~$ npm run vendor

# open a new terminal
vagrant@actor5:~$ cd ~/src
# to run the benchmark for gateway
vagrant@actor5:~$ npm run gateway-client-benchmark
# otherwise
vagrant@actor5:~$ npm run gateway

# open new terminal, run the benchmark for device
vagrant@actor3:~$ cd ~/src
vagrant@actor3:~$ npm run device-pksig-client-benchmark # for PK-SIG scenario
vagrant@actor3:~$ npm run device-sksig-client-benchmark # for SK-SIG scenario
vagrant@actor3:~$ npm run device-fingerprint-client-benchmark # for FINGERPRINTING scenario
vagrant@actor3:~$ npm run device-mac-client-benchmark # for MAC-ADDRESS scenario
```

The results will be shown directly in the console.

### 3. Access Authorization, Handshake, and Accessing Resource ###

In our final scenario, we benchmark the `iot-service` as a client of our access authorization and secure channel handshake procedures.
Run the following commands.

```console
# open new terminal
vagrant@actor4:~$ cd ~/src
vagrant@actor4:~$ npm run isp

# open a new terminal
vagrant@actor2:~$ cd ~/src
vagrant@actor2:~$ npm run owner

# open a new terminal
vagrant@actor6:~$ cd ~/src
vagrant@actor6:~$ npm run vendor

# open a new terminal
vagrant@actor5:~$ cd ~/src
vagrant@actor5:~$ npm run gateway

# open a new terminal, run the service benchmark
vagrant@actor7:~$ cd ~/src
vagrant@actor7:~$ npm run service-client-benchmark-access # for access authorization
vagrant@actor7:~$ npm run service-client-benchmark-handshake # for the secret key handshake
vagrant@actor7:~$ npm run service-client-benchmark-resource # for accessing resource using the secret key
```

The results will be shown directly in the console.

**Note**: The benchmark result will vary depending on the host machines where you perform the benchmark.
Moreover, our benchmark can leverage the multi CPUs that the guest machines have.
