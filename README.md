# NFT Paper Prototype

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

## Get startet

### Contracts

To run it locally, the following steps have to be performed.

- Install [Clarinet](https://github.com/hirosystems/clarinet)
- Spawn a local Devnet
  - You can use Clarinet to deploy your contracts to your own local offline environment for testing and evaluation on a blockchain. Use the following command:

```bash
$ clarinet integrate
```

Make sure that you have a working installation of Docker running locally.

### Frontend

```sh
## Move into /frontend folder
$ cd frontend

# Install dependencies
$ npm install

# Enable husky
$ npm install husky --save-dev

# Start dev server
$ npm run dev
```

In the following file [`frontend/providers/StacksAuthProvider.tsx`](/frontend/providers/StacksAuthProvider.tsx) change to

```javascript
//const network = new StacksTestnet()
const network = new StacksMocknet();
```

The `next.config.js` file should changed as well.

```javascript
module.exports = {
  reactStrictMode: true,
  env: {
    REACT_APP_NETWORK_ENV: "mocknet", // From testnet to mocknet
    REACT_APP_CONTRACT_ADDRESS: "CHANGE TO YOUR DEPLOYER ADDRESS",
    CONTRACT_PRIVATE_KEY: undefined,
    LOCAL_STACKS_API_PORT: 3999,
    // API_SERVER: undefined,
  },
  //https://nextjs.org/docs/api-reference/next.config.js/react-strict-mode
  reactStrictMode: false,
};
```

## Have fun trying out!

## Features

- ESLint and Prettier are integrated with VSCode to fix and format code on save (you need eslint and prettier VSCode plugins)
- lint-staged: linting will only happen on staged files, not all file
- Latest Husky
- TypeScript types are checked before each commit