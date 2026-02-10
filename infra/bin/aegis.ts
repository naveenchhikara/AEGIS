#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AegisStack } from "../lib/aegis-stack";

const app = new cdk.App();

new AegisStack(app, "AegisStack", {
  env: {
    region: "ap-south-1",
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
  description: "AEGIS - UCB Audit Management Platform (production)",
});
