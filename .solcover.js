module.exports = {
  client: require('ganache-cli'),
  skipFiles: ['mocks/', 'interfaces/', 'dependencies/'],
  mocha: {
    enableTimeouts: false,
  },
  providerOptions: {},
  configureYulOptimizer: true,
};
