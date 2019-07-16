import * as pulumi from "@pulumi/pulumi";
import axios from "axios";

const soConfig = new pulumi.Config("stackOverflow");
const soApiKey = soConfig.require("apiKey");
const soSearchKeyword = soConfig.require("searchKeyword");

export interface Question {
  link: string;
  owner: { display_name: string; link: string; profile_image: string };
  title: string;
  creation_date: Date;
  view_count: number;
  answer_count: number;
  comment_count: number;
  is_answered: boolean;
  tags: Array<string>;
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
