# BorderChain #

This repository is the implementation from our paper "BorderChain: Blockchain-Based Access Control Framework for the Internet of Things Endpoint", which is published [here]().

## Installation ##

You need `vagrant` and `virtualbox` for this project.
So install them first if you do not have it yet in your machine.
You can download them [here](https://www.vagrantup.com/downloads.html) and [here](https://www.virtualbox.org/wiki/Downloads).
All of the required softwares and tools has been included in the `Vagrantfile` and it will be installed during the `vagrant up` using shell provisioning scripts in `./shell` directory.

```console
foo@ubuntu:~$ cd ~/
foo@ubuntu:~$ git clone https://github.com/mrkazawa/border-chain.git
foo@ubuntu:~$ cd ~/border-chain

foo@ubuntu:~$ vagrant up # if it is our first time, this will take some times
foo@ubuntu:~$ vagrant rsync-auto # this is to synchronize the code from your git to the deployed VMs

# open eight new terminals and SSH to each of the following VMs.
foo@ubuntu:~$ vagrant ssh actor1 # for ethereum
foo@ubuntu:~$ vagrant ssh actor1 # for admin
foo@ubuntu:~$ vagrant ssh actor2 # for owner
foo@ubuntu:~$ vagrant ssh actor3 # for device
foo@ubuntu:~$ vagrant ssh actor4 # for isp
foo@ubuntu:~$ vagrant ssh actor5 # for gateway
foo@ubuntu:~$ vagrant ssh actor6 # for vendor
foo@ubuntu:~$ vagrant ssh actor7 # for iot-service
```

Inside all of the SSH-ed instances, we need to install all of the Node JS dependencies.
Run this in all of SSH-ed instances.

```console
vagrant@actor1:~$ cd ~/src
vagrant@actor1:~$ npm install

vagrant@actor1:~$ npm run-script # to show all available NPM commands
```

Repeat the above command for the rest of the VMs, from `actor2` to `actor7`.
Other useful commands,

```console
foo@ubuntu:~$ cd ~/border-chain
foo@ubuntu:~$ vagrant reload # to restart VM
foo@ubuntu:~$ vagrant halt # to shutdwon VM
foo@ubuntu:~$ vagrant destroy -f # to completely delete VM
```

## Running Ethereum and Admin ##

We need an a trusted mediator called `admin` to bootstrap our environment.
This entity exists only for development purposes and should not be available in the production case.
The roles of `admin` are as follows.

- First, we use it as the governor of our blockchain.
The `admin` will run the Ethereum network and distribute the contract ABI to all of other IoT entities in our environment, which are the blockchain nodes.
The `admin` also seed money to the participant blockchain address.

- Second, we use `admin` as a broker to relay information between instances.
For example, `owner` relays the `gateway`'s private key, public key, as well as its blockchain address to the `gateway`'s machine through `admin`.

```console
vagrant@actor1:~$ cd ~/src
vagrant@actor1:~$ npm run eth-network # run the ethereum network using ganache

# open another terminal, then
vagrant@actor1:~$ cd ~/src
vagrant@actor1:~$ npm run admin # run the truffle deploy and the admin server
```

## Running Our Access Control ##

Our proposed access control contains of four parts: gateway (or endpoint) authentication, device authentication, endpoint authorization, and accessing resource.
At each scenario, we have several entities that act as either clients or servers.

Note that, the following commands has to be performed in order.

### 1. Gateway or Endpoint Authentication ###

#### Running the `isp` ####

The Internet Service Provider (`isp`) provides authentication for domain `owner`.
The `owner` has to authenticate his `gateway` by providing his credentials, his gateway address, and legitimate IP to the `isp`.
When the authentication is successful, the `isp` will present attestation or approval of the `gateway` IP and identity.
The `isp` instructing the smart contract to insert the `owner`'s `gateway` address to its trusted list.

```console
vagrant@actor4:~$ cd ~/src
vagrant@actor4:~$ npm run isp
```

This will run the `isp` authentication server.
Next we will run the domain `owner` code to connect to this server.

#### Running the `owner` ####

This command will simulate the domain `owner` authentication request to the `isp` server.
Behind the scene, the `owner` also needs to store the log of the authentication request in the blockcahin.

```console
vagrant@actor2:~$ cd ~/src
vagrant@actor2:~$ npm run owner
```

When everything is okay, you will notice a log in the console indicating the gateway authentication is successful.

### 2. Device Authentication ###

#### Running the `vendor` ####

The `vendor` provides the authentication for IoT `device` that he manufactured.
Specifically, the `vendor` has to validate the authenticity of the `device` by performing one of the followings.

1. PKSIG, the ECDSA signature using the device private key.
2. SKSIG, the HMAC signature using the device pre-shared secret key.
3. Fingerprint, hash the secret parts of the device.
4. MAC, provide the MAC address as identity.

When the authentication is success, the `vendor` will instruct the smart contract to insert the `device`'s address to its trusted list.

```console
vagrant@actor6:~$ cd ~/src
vagrant@actor6:~$ npm run vendor
```

This will run the `vendor` authentication server.
The server will wait for `device` authentication requsts from the `gateway`.

#### Running the `gateway` ####

The `gateway` will relay the authentication payload form the `device` to the `vendor`.
However, it will also anchor the payload to the blockchain.

```console
vagrant@actor5:~$ cd ~/src
vagrant@actor5:~$ npm run gateway
```

This will run the `gateway` server and wait for the IoT `device` to send the authentication payload to the server.

#### Running the `device` ####

We will perform all of the available authentication options in the `device`.
Mainly, the public-key signature, symmetric key signature, device fingerprinting, and mac authentication.

The following command will send authentication payload to the `gateway`.

```console
vagrant@actor3:~$ cd ~/src
vagrant@actor3:~$ npm run device-pksig # for public key signature
vagrant@actor3:~$ npm run device-sksig # for symmetric key scheme
vagrant@actor3:~$ npm run device-fingerprint # for device fingerprinting
vagrant@actor3:~$ npm run device-mac # for mac address authentication
```

When everything is okay, you will notice a log in the console indicating the device authentication is successful.

### 3. Endpoint Authorization and Accessing Resource ###

#### Running the `service` ####

After the `gateway` and `device` completes their authentications, we can continue to grant endpoint access to other entities.
In this example, the `owner` allow IoT `service` to access his domain through the `gateway`.
Therefore, the `gateway` will act as an authorization server while the `service` will request for access to the `gateway`.
Then, the `service` constructs a secure channel with the `gateway` before accessing the resource.
Once the channel is established, it can begin request for resource using encrypted requests and responses.

```console
vagrant@actor7:~$ cd ~/src
vagrant@actor7:~$ npm run service
```

When everything is okay, you will notice a log in the console indicating the endpoint authorization is successful.
You can also see the generated secret key for accesing resource.
Finally, the resource response from the gateway will also displayed in the console.

## Known Issues ##

If the node cannot ping to one another, perhaps it has the problem with the Avahi DNS.
Try to ping to itself using the configured domain in all nodes.
Then, try to ping one another.

```console
vagrant@actor1:~$ ping actor1.local
vagrant@actor2:~$ ping actor2.local
vagrant@actor3:~$ ping actor3.local
vagrant@actor4:~$ ping actor4.local
vagrant@actor5:~$ ping actor5.local
vagrant@actor6:~$ ping actor6.local
vagrant@actor7:~$ ping actor7.local
```

After that try to ping one another, this should solves the issues.

## Authors ##

- **Yustus Oktian** - *Initial work*

## Acknowledgments ##

- Hat tip to anyone whose code was used
- Fellow researchers
- Korea Government for funding this project
