#!/usr/bin/env bash

if [[ $# -lt 2 || $# -gt 2 ]]; then
  echo "You need to put two arguments: MODE and NUMBER_OF_ITERATION"
else
  # get value from argument
  MODE=$1
  NUMBER_OF_ITERATION=$2

  # get the full path to this bash file
  DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

  counter=1
  while [[ $counter -le $NUMBER_OF_ITERATION ]]; do
    node $DIR/operation $MODE
    ((counter++))
  done
fi
