# Nemesis #

This repository is the implementation of our access control framework from the paper "Nemesis: ", which is published [here]().

## Installation ##

You need `vagrant` and `virtualbox` for this project.
So install them first if you do not have it yet in your machine.
You can download them [here](https://www.vagrantup.com/downloads.html) and [here](https://www.virtualbox.org/wiki/Downloads).
All of the required softwares and tools has been included in the `Vagrantfile` and it will be installed during the `vagrant up` using shell provisioning scripts in `./shell` directory.

```console
foo@ubuntu:~$ cd ~/
foo@ubuntu:~$ git clone https://github.com/mrkazawa/nemesis.git
foo@ubuntu:~$ cd ~/nemesis

foo@ubuntu:~$ vagrant up # if it is our first time, this will take some times
foo@ubuntu:~$ vagrant rsync-auto # this is to synchronize the code from your git to the deployed VMs

# open one terminal each to SSH to each of the following VMs.
foo@ubuntu:~$ vagrant ssh actor1 # for admin
foo@ubuntu:~$ vagrant ssh actor2 # for owner
foo@ubuntu:~$ vagrant ssh actor3 # for device
foo@ubuntu:~$ vagrant ssh actor4 # for isp
foo@ubuntu:~$ vagrant ssh actor5 # for gateway
foo@ubuntu:~$ vagrant ssh actor6 # for vendor
```

Inside all of the SSH instances, we need to install all of the Node JS dependencies.
Run this in all of SSH-ed instances.

```console
vagrant@actor1:~$ cd ~/src
vagrant@actor1:~$ npm install

vagrant@actor1:~$ npm run-script # to show all available NPM commands
```

Repeat the above command for `actor2` to `actor6`.

Other useful commands,

```console
foo@ubuntu:~$ cd ~/nemesis
foo@ubuntu:~$ vagrant reload # to restart VM
foo@ubuntu:~$ vagrant halt # to shutdwon VM
foo@ubuntu:~$ vagrant destroy -f # to completely delete VM
```

- - - -

## Gateway and Device Authentication ##

In this scenario, we show you how to use our gateway and device authentication.
Note that, the following commands has to be performed in order.

### 0. Running the Admin ###

We need the admin for many purposes.

- First, we use admin as the governor of our blockchain.
The admin will run the Ethereum network and distribute the contract ABI to all of the pariticipants.
The admin also seed money to the participant blockchain address.

- Second, we use admin as a broker to relay information between instances.
For example, owner relays the gateway's gateway private key, public key, as well as the address to the gateway through admin.
This broker is used only for simulation purposes.
We will not use this in our environment.

```console
vagrant@actor1:~$ cd ~/src
vagrant@actor1:~$ npm run eth-network # running the ethereum network in ganache

# open another terminal, then
vagrant@actor1:~$ cd ~/src
vagrant@actor1:~$ npm run admin # running the truffle deploy and the admin server
```

### 1. Running the ISP ###

The ISP authentication server provides the authentication for domain owner.
The owner has to authenticate his gateway by providing his credentials, his gateway address, and legitimate IP to the ISP.
When the authentication is successful, the ISP will instruct the smart contract to insert the owner's gateway address to its trusted list.

```console
vagrant@actor4:~$ cd ~/src
vagrant@actor4:~$ npm run isp
```

This will run the ISP authentication server.
Next we will run the domain owner code to connect to this server.

### 2. Running the Domain Owner ###

This command will simulate the domain owner authentication request to the ISP server.
However, the domain owner also needs to store the authentication request in the blockcahin.
The following command abstract both of those operations.

```console
vagrant@actor2:~$ cd ~/src
vagrant@actor2:~$ npm run owner
```

When everything is okay, you will notice a log in the console indicating the authentication is successful.

### 3. Running the Vendor ###

The vendor server provides the authentication for IoT devices that he manufactured.
The vendor has to validate the authenticity of the devices by performing the public-key signaturing and encryption, secret key encryption, device fingerprinting, or mac authentication.
When the authentication is success, the vendor will instruct the smart contract to insert the device's address to its trusted list.

```console
vagrant@actor6:~$ cd ~/src
vagrant@actor6:~$ npm run vendor
```

This will run the vendor REST API server.
The server will wait for device authentication requsts from the gateway.

### 4. Running the Gateway ###

The gateway will relay the authentication payload form the device to the vendor.
However, it will also anchor the payload to the blockchain.
So, the following command will abstract both actions.

```console
vagrant@actor5:~$ cd ~/src
vagrant@actor5:~$ npm run gateway
```

This will run the gateway REST API server and wait for the IoT device to send the authentication payload to the server.

### 5. Running the Device ###

We will perform all of the available authentication options in the device.
Mainly, the public-key signaturing and encryption, secret key encryption, device fingerprinting, and mac authentication.

The following command will send authentication payload to the gateway.
The gateway then will relay the payload to the vendor after posting it in the blockchain.

```console
vagrant@actor3:~$ cd ~/src
vagrant@actor3:~$ npm run device-pke # for public key scheme
vagrant@actor3:~$ npm run device-ske # for symmetric key scheme
vagrant@actor3:~$ npm run device-fingerprint # for device fingerprinting
vagrant@actor3:~$ npm run device-mac # for mac address authentication
```

When everything is okay, you will notice a log in the console indicating the authentication is successful.

- - - -

## Endpoint Authorization ##

- - - -

## Accessing Authorization ##

- - - -

## Revocation ##

- - - -

## Benchmarking ##

We also provide several benchmarking scenario to assess the performance of our proposed framework.
You can go [here]() to follow the instructions to run the benchmark.

## Known Issues ##

If the node cannot ping to one another, perhaps it has the problem with the Avahi DNS.
Try to ping to itself using the configured domain in all nodes.
Then, try to ping one another.

```console
vagrant@actor1:~$ ping actor1.local
vagrant@actor2:~$ ping actor2.local
vagrant@actor3:~$ ping actor3.local
vagrant@actor4:~$ ping actor4.local
```

After that try to ping one another, this should solves the issues.

## Authors ##

- **Yustus Oktian** - *Initial work*

## Acknowledgments ##

- Hat tip to anyone whose code was used
- Fellow researchers
- Korea Government for funding this project
