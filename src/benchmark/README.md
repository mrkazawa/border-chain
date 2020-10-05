# Benchmarking #

The purpose of this document is to guide how to perform benchmarking for this project.

## Scenarios ##

We have several benchmarking scenarios.

1. Measure the capability of the cryptographic libraries used in this project.
2. Benchmark the client side of our access control scheme.
3. Stress test our authentication and authorization servers.

**Note**: We will use the VM to measure the benchmark specified in the [Vagrantfile](https://github.com/mrkazawa/border-chain/blob/master/Vagrantfile).
All of the instructions here are assuming to use the same VM configuration.
Furthermore, our code can also be run directly without VM.
However, you need to adjust your prompt yourself as it may show a different prompt like the one in this example.
