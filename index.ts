import * as aws from "@pulumi/aws";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import * as stackOverflow from "./stackOverflow";
import * as slack from "./slack";

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
        await slack.sendToSlack(question);
      }
    } catch (err) {
      console.log(`GET QUESTIONS error: ${JSON.stringify(err.stack)}`);
    }
  }
);
