# lambda-deployer
A simple framework for developing and deploying AWS Lambda Functions.

## deploy
Rename config.template.js to config.js and add your AWS information.
Specify aws.function.initialStage ( default is 'dev' ).
aws.function.default holds default values for your Lambda Functions.
You can overwrite default values by specifying values in each stage.
You can also overwrite values by specifying them in the Lambda Function meta object.

You deploy Lambda Functions using a NodeJS script.

Navigate to the deploy folder:
```
//to deploy a single file
node deploy <project> <lambda-function-name> ...

//to deploy all files in a project
node deploy <project>

```

## projects
You can create multiple projects in the projects folder. A project consists of the following structure:

```

project
  common
    some-script.js
  lambda-function.js
  node_modules

```

Each project has it's own dependencies that each Lambda Function will be packed with.
Lambda Functions will be deployed and named as {project}-{lambda-function}.js
For example, the hello.js Lambda Function in the 'example' folder will be deployed as example-hello.js

## development
I will be developing this framework further with the following enhancements:
- API generator that will produce a YAML script with definitions based on the meta object in the Lambda Functions.
- Pusher that will take all Lambda Functions that are currently in $Latest version, create a new version for them, and associate the specified stage alias to that version.

You can follow along as I flesh out the concept on Medium: https://medium.com/@gailsparks

If you want to make this framework better, feel free to chip in.