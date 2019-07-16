import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import axios from "axios";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import * as stackOverflow from "./stackOverflow";

const slackConfig = new pulumi.Config("slack");
const slackChannel = slackConfig.require("channel");
const slackWebhookUrl = slackConfig.require("webhookUrl");
const slackIconUrl =
  "http://cdn.sstatic.net/stackexchange/img/logos/so/so-icon.png";

// Create a table `questions` with `question_id` as primary key
const questions = new aws.dynamodb.Table("stackoverflow-questions", {
  attributes: [
    {
      name: "question_id",
      type: "N"
    }
  ],
  hashKey: "question_id",
  billingMode: "PAY_PER_REQUEST"
});

// Takes a question and posts it to Slack via a webhook.
// TODO: Should this function fire on Insert event?
const sendToSlack = async (q: stackOverflow.Question) => {
  let requestData = {
    channel: slackChannel,
    icon_url: slackIconUrl,
    username: "StackOverflow",
    text: "New question on <" + q.link + "|" + "StackOverflow>",
    unfurl_links: true,
    attachments: [
      {
        fallback: "New question on StackOverflow",
        color: "#36a64f",
        author_name: q.owner.display_name,
        author_link: q.owner.link,
        author_icon: q.owner.profile_image,
        title: q.title,
        title_link: q.link,
        footer: "SlackOverflow Notification",
        footer_icon: slackIconUrl,
        ts: q.creation_date,
        unfurl_links: true,
        fields: [
          {
            title: "# Views",
            value: q.view_count,
            short: true
          },
          {
            title: "# Comments",
            value: q.comment_count,
            short: true
          },
          {
            title: "# Answers",
            value: q.answer_count,
            short: true
          },
          {
            title: "Answered",
            value: q.is_answered ? "✅" : "🚫",
            short: true
          },
          {
            title: "Tags",
            value: q.tags.join(", "),
            short: true
          }
        ]
      }
    ]
  };
  try {
    const res = await axios.post(slackWebhookUrl, requestData);
    console.log(`SEND TO SLACK response: ${JSON.stringify(res.data)}`);
  } catch (err) {
    console.log(`SEND TO SLACK error: ${JSON.stringify(err.stack)}`);
  }
};

const questionExists = async (client: DocumentClient, question_id: number) => {
  const result = await client
    .query({
      TableName: questions.name.get(),
      KeyConditionExpression: "#qid = :qid",
      ExpressionAttributeNames: {
        "#qid": "question_id"
      },
      ExpressionAttributeValues: {
        ":qid": question_id
      }
    })
    .promise();
  const { Count: count = 0 } = result;
  return count > 0;
};

// A lambda function that runs every 20 minutes
const getStackOverflowQuestions = aws.cloudwatch.onSchedule(
  "getStackOverflowQuestions",
  "rate(20 minutes)",
  async event => {
    try {
      const client = new aws.sdk.DynamoDB.DocumentClient();
      // Just grabbing the first question for now.
      const [question] = await stackOverflow.getQuestions();

      // TODO: Is this needed? Will it fail to insert a duplicate question_id?
      const exists = await questionExists(client, question.question_id);
      console.log(
        `GET QUESTION: question_id ${question.question_id} Exists? ${exists}`
      );
      if (!exists) {
        console.log(
          `GET QUESTION: processing question_id ${question.question_id}`
        );
        // Get comment count
        const comments = await stackOverflow.getQuestionComments(
          question.question_id
        );
        await client
          .put({
            TableName: questions.name.get(),
            Item: { ...question, comment_count: comments.length }
          })
          .promise();
        await sendToSlack(question);
      }
    } catch (err) {
      console.log(`GET QUESTIONS error: ${JSON.stringify(err.stack)}`);
    }
  }
);
