#!/usr/bin/env bash

if [[ $# -lt 2 || $# -gt 2 ]]; then
  echo "You need to put two arguments: MODE and NUMBER_OF_ITERATION"
else
  # get value from argument
  MODE=$1
  NUMBER_OF_ITERATION=$2

  # get number of cores
  CORES="$(nproc --all)"
  echo "Running with $CORES threads"

  # get the full path to this bash file
  DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

  # empty file
  if [ "$MODE" == "1" ]; then
    echo "" >sign-payload.csv
  elif [ "$MODE" == "2" ]; then
    echo "" >encrypt-payload.csv
  elif [ "$MODE" == "3" ]; then
    echo "" >decrypt-payload.csv
  elif [ "$MODE" == "4" ]; then
    echo "" >sign-transaction.csv
  fi

  counter=1
  while [[ $counter -le $NUMBER_OF_ITERATION ]]; do
    node $DIR/operation $MODE
    ((counter++))
  done
fi
