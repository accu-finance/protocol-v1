module.exports = {
  client: require('ganache-cli'),
  skipFiles: ['./mocks', './interfaces'],
  mocha: {
    enableTimeouts: false,
  },
  providerOptions: {},
  configureYulOptimizer: true,
};
