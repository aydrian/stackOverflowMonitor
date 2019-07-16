import * as pulumi from "@pulumi/pulumi";
import axios from "axios";
import { Question } from "./stackOverflow";

const slackConfig = new pulumi.Config("slack");
const slackChannel = slackConfig.require("channel");
const slackWebhookUrl = slackConfig.require("webhookUrl");
const slackIconUrl =
  "http://cdn.sstatic.net/stackexchange/img/logos/so/so-icon.png";

// Takes a question and posts it to Slack via a webhook.
// TODO: Should this function fire on Insert event?
export const sendToSlack = async (q: Question) => {
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
    return res.data;
  } catch (err) {
    console.log(`SEND TO SLACK error: ${JSON.stringify(err.stack)}`);
  }
};
