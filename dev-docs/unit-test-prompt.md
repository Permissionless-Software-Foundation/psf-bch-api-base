The express.js app in the `app/` directory needs unit and integration tests. The scope of this task is to create a plan for adding these

When considering the creation of tests, follow the patters provided in the example available in the `testing/testing-example-code/` directory. This is simple node.js application which uses the following testing libraries:

- mocha as a test runner  
- chai as an assertion library  
- sinon as a stubing library

The code example show common patterns for writing both unit and integration tests.  
  
The `/app/examples/` directory contains working code that I've tested and verified works correctly. The unit and integration tests you create should cover the same code paths exercised by these examples.

The testing dependencies are already installed and listed in the package.json file under the `app/` directory. The package.json file also contains the `test`, `test:integration`, and `coverage` scripts that we'll use to run tests and measure test coverage.