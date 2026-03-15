#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { EcrStack, AppStack } from "../lib/ecr-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// Deploy target: "ecr" or "app" (passed via --context target=ecr)
const target = app.node.tryGetContext("target") ?? "all";

if (target === "ecr" || target === "all") {
  new EcrStack(app, "NodeApp3EcrStack", { env });
}

if (target === "app" || target === "all") {
  new AppStack(app, "NodeApp3AppStack", { env });
}
