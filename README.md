# Ephemeral Environments in Serverless

How to successfully use ephemeral environments and non-serverless services, with example in the AWS CDK and Typescript in serverless.

![image](./docs/images/header.png)

The article for this repo can be found here: https://medium.com/@leejamesgilmore/serverless-ephemeral-environments-with-serverful-aws-services-c803d24b353f

> Note: This is not production ready is and is created for talking through key aspects of serverless testing.

### Deploying the solution

> Note: This solution has serverful resources such as a a NAT Gateway and DocumentDB cluster which are not pay as you go like the other serverless components. You will eb charged for these.

To deploy the solution for non ephemeral environments you can use the npm scripts:

`npm synth:test`

`npm run deploy:test:stateful`

`npm run deploy:test:stateless`

To destroy an environment run `npm run remove:test` in the example of the test environment above.

For ephemeral environments run the following in a batch script, terminal locally, or pipeline:

`STAGE=pr-123 cdk synth --all`

`STAGE=pr-123 cdk deploy pr-123-GilmoreClothingStatefulStack`

`STAGE=pr-123 cdk deploy pr-123-GilmoreClothingStatelessStack`
