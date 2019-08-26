#!/bin/bash

# parameters
docker_ip=127.0.0.1
ipfs_staging="$HOME/Projects/iot_domain_auth/ipfs/staging"
ipfs_data="$HOME/Projects/iot_domain_auth/ipfs/data"

# run docker
docker run -d --name ipfs_host -v $ipfs_staging:/ipfs/staging -v $ipfs_data:/ipfs/data -p 4001:4001 -p $docker_ip:8080:8080 -p $docker_ip:5001:5001 ipfs/go-ipfs:latest