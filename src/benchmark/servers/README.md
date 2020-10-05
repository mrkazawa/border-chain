# Server Benchmarking #

This document elaborates on how to measure the authentication or authorization server's performance when performing our access control scenarios.

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

We have three server benchmarking scenarios.
The servers are implemented using [express](https://www.npmjs.com/package/express) REST API.
We then use [autocannon](https://www.npmjs.com/package/autocannon) module to stress the load of the servers.

### 1. Gateway Authentication ###

In this scenario, we want to measure the `isp` performance during the gateway authentication request.
Run the following commands.

```console
# open new terminal
vagrant@actor4:~$ cd ~/src
vagrant@actor4:~$ npm run isp-benchmark

# open new terminal
vagrant@actor2:~$ cd ~/src
vagrant@actor2:~$ npm run owner-benchmark
```

The result will be shown directly in the console.

### 2. Device Authentication ###

In this second scenario, we benchmark the `vendor` as the server of our device authentication procedure.
To do so, run the following commands.

```console
# open new terminal
vagrant@actor4:~$ cd ~/src
vagrant@actor4:~$ npm run isp

# open a new terminal
vagrant@actor2:~$ cd ~/src
vagrant@actor2:~$ npm run owner

# open new terminal
vagrant@actor6:~$ cd ~/src
vagrant@actor6:~$ npm run vendor-benchmark

# open new terminal
vagrant@actor5:~$ cd ~/src
vagrant@actor5:~$ npm run gateway-benchmark-vendor

# open a new terminal, run the device based on the authentication type
vagrant@actor3:~$ cd ~/src
vagrant@actor3:~$ npm run device-pksig # for PK-SIG scenario
vagrant@actor3:~$ npm run device-sksig # for SK-SIG scenario
vagrant@actor3:~$ npm run device-fingerprint # for FINGERPRINTING scenario
vagrant@actor3:~$ npm run device-mac # for MAC-ADDRESS scenario
```

The results will be shown directly in the console.

### 3. Access Authorization, Handshake, and Accessing Resource ###

In our final scenario, we benchmark the `gateway` as a server of our access authorization and secure channel handshake procedures.
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

# open a new terminal, run the gateway based on the scenario
vagrant@actor5:~$ cd ~/src
vagrant@actor5:~$ npm run gateway-benchmark-access # for access authorization
vagrant@actor5:~$ npm run gateway-benchmark-handshake # for secret key handshaking
vagrant@actor5:~$ npm run gateway # for accessing resource using the secret key

# open a new terminal, run the service based on the scenario
vagrant@actor7:~$ cd ~/src
vagrant@actor7:~$ npm run service-benchmark-access # for access authorization
vagrant@actor7:~$ npm run service-benchmark-handshake # for the secret key handshake
vagrant@actor7:~$ npm run service-benchmark-resource # for accessing resource using the secret key
```

The results will be shown directly in the console.

**Note**: The benchmark result will vary depending on the host machines where you perform the benchmark.
Moreover, our benchmark can leverage the multi CPUs that the guest machines have.
