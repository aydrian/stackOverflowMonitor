[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Stack Overflow Monitor

A simple serverless app to monitor Stack Overflow in Slack.

This Pulumi application will create a DynamoDB table and a Lambda Function that will run every 20 minutes, querying StackOverflow, saving the results to the database, and outputting them to a Slack channel.

## Pre-requisites

- [Pulumi configured for AWS](https://www.pulumi.com/docs/quickstart/aws/)
- A [Slack](https://www.slack.com) team with an [Incoming Webhook](https://api.slack.com/incoming-webhooks)
- A [Stack Exchange API Key](https://stackapps.com/apps/oauth/register)

## Deploying and running the Pulumi App

1. Create a new stack:

```bash
$ pulumi stack init stackOverflowMonitor
```

1. Set the AWS region:

```bash
$ pulumi config set aws:region us-east-1
```

1. Set the Slack channel to post to

```bash
$ pulumi config set slack:channel #stack-overflow
```

1. Set the Slack Webhook Url

```bash
$ pulumi config set slack:webhookUrl https://your.url
```

1. Set your Stack Exchange API Key as a secret

```bash
$ pulumi config set --secrret stackOverflow:apiKey YOUR_API_KEY
```

1. Set the Keyword you are interested in monitoring

```bash
$ pulumi config set stackOverflow:searchKeyword pulumi
```

1.  Restore NPM modules via `npm install` or `yarn install`.

1.  Run `pulumi up` to preview and deploy changes

## Clean up

1.  Run `pulumi destroy` to tear down all resources.

1.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi Console.

Based on [stackOverflowMonitor](https://github.com/picsoung/stackOverflowMonitor) by Nicolas Grenié ([@picsoung](https://github.com/picsoung) :panda_face:)
