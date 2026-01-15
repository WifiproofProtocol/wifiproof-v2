#!/bin/bash
set -e

echo "Compiling circuit..."
if ! nargo compile; then
    echo "Circuit compilation failed"
    exit 1
fi

echo "Executing circuit to generate witness..."
if ! nargo execute; then
    echo "Circuit execution failed"
    exit 1
fi

echo "Generating proof and verification key..."
if ! bb prove -b ./target/circuit.json -w ./target/circuit.gz --write_vk -o ./target --oracle_hash keccak; then
    echo "Failed to generate proof"
    exit 1
fi

echo "Verifying proof..."
if ! bb verify -p ./target/proof -k ./target/vk --oracle_hash keccak; then
    echo "Proof verification failed"
    exit 1
fi

echo "Generating Solidity verifier contract..."
if ! bb write_solidity_verifier -k ./target/vk -o ../../contracts/src/Verifier.sol -t evm; then
    echo "Failed to generate Solidity verifier"
    exit 1
fi

echo "Build complete!"
