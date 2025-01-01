# Midnight Example Applications

This is a multi-package repo containing example applications that are used to showcase Midnight and its capabilities.

## Details

Details of the contents of this repository can be found in [Midnight documentation](https://docs.midnight.network/)

## Requirements

Node.js - LTS/hydrogen


## Important Notes
1. When configuring a new workspace, create a copy of a template and change the names, update workspaces
2. run "yarn" at the root
3. Run nvm install at the project workspace level
4. Run npx turbo build at the project workspace level

## Developing strategy
### testing using just logic (JEST)
1. Within the contract folder, compile Contract using comptactc ....
2. Within the contract folder, build the contract using yarn build
3. Within the contract folder, test the contract using yarn test

### testing using Midnight APIs, providers, wallet and Docker node-indexer-proofserver (JEST)
4. Within the midnight-js folder, elaborate the API and build it using yarn build
5. Within the midnight-js folder, develop the test folder and test it using yarn build

### testing using UI framework and real Midnight server and concensus
6. Within the UI folder, elaborate the UI and build it using yarn build
7. Within the UI folder, run the UI using yarn start

## Some external issues resolvers
when doing a compile, change the exports for export for ledger, contract, purecircuits and others. At contract/dist/manged/mxmxmx/contract/index.cjs.
