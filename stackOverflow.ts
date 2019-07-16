import * as pulumi from "@pulumi/pulumi";
import axios from "axios";

const soConfig = new pulumi.Config("stackOverflow");
const soApiKey = soConfig.require("apiKey");
const soSearchKeyword = soConfig.require("searchKeyword");

export interface Question {
  tags: Array<string>;
  owner: {
    reputation: number;
    user_id: number;
    user_type: string;
    accept_rate: number;
    profile_image: string;
    display_name: string;
    link: string;
  };
  is_answered: boolean;
  view_count: number;
  answer_count: number;
  score: number;
  last_activity_date: Date;
  creation_date: Date;
  last_edit_date: Date;
  question_id: number;
  link: string;
  title: string;
  comment_count: number;
}

export const getQuestions = async () => {
  const res = await axios.get(
    "https://api.stackexchange.com/2.2/search/advanced",
    {
      params: {
        pagesize: 1,
        order: "desc",
        sort: "creation",
        site: "stackoverflow",
        q: soSearchKeyword,
        key: soApiKey
      }
    }
  );
  const { items } = res.data;
  return items;
};

export const getQuestionComments = async (question_id: number) => {
  const res = await axios.get(
    `https://api.stackexchange.com/2.2/questions/${question_id}/comments`,
    {
      params: {
        order: "desc",
        sort: "creation",
        site: "stackoverflow",
        key: soApiKey
      }
    }
  );
  const { items } = res.data;
  return items;
};
