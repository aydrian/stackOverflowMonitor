import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import axios from "axios";

const soConfig = new pulumi.Config("stackOverflow");
const soApiKey = soConfig.require("apiKey");
const soSearchKeyword = soConfig.require("searchKeyword");

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
const sendToSlack = async (q: {
  link: string;
  owner: { display_name: any; link: any; profile_image: any };
  title: any;
  creation_date: any;
  view_count: any;
  answer_count: any;
  is_answered: any;
  tags: { join: (arg0: string) => void };
}) => {
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
  } catch (err) {
    console.log(`SEND TO SLACK error: ${JSON.stringify(err.stack)}`);
  }
};

// A lambda function that runs every 20 minutes
const getStackOverflowQuestions = aws.cloudwatch.onSchedule(
  "getStackOverflowQuestions",
  "rate(20 minutes)",
  async event => {
    try {
      const client = new aws.sdk.DynamoDB.DocumentClient();
      const url = `https://api.stackexchange.com/2.2/search/advanced?pagesize=1&order=desc&sort=creation&site=stackoverflow&q=${soSearchKeyword}&key=${soApiKey}`;
      let res = await axios.get(url);
      const {
        items: [question]
      } = res.data;
      // is question in db?
      console.log(
        `GET QUESTIONS: question_id = ${
          question.question_id
        } type ${typeof question.question_id}`
      );
      const result = await client
        .query({
          TableName: questions.name.get(),
          KeyConditionExpression: "#qid = :qid",
          ExpressionAttributeNames: {
            "#qid": "question_id"
          },
          ExpressionAttributeValues: {
            ":qid": question.question_id
          }
        })
        .promise();
      // if no, add to db and send to slack
      if (result.Count === 0) {
        await client
          .put({
            TableName: questions.name.get(),
            Item: question
          })
          .promise();
        sendToSlack(question);
      }
    } catch (err) {
      console.log(`GET QUESTIONS error: ${JSON.stringify(err.stack)}`);
    }
  }
);
