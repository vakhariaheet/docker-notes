import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

// ── Stack 1: ECR only ─────────────────────────────────────────────────────────
// Runs first so the image can be pushed before ECS is created.
export class EcrStack extends cdk.Stack {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.repository = new ecr.Repository(this, "Repository", {
      repositoryName: "node-app-3",
      lifecycleRules: [
        {
          description: "Remove untagged images after 1 day",
          tagStatus: ecr.TagStatus.UNTAGGED,
          maxImageAge: cdk.Duration.days(1),
        },
        {
          description: "Keep only last 5 tagged images",
          tagStatus: ecr.TagStatus.TAGGED,
          tagPrefixList: ["sha-"],
          maxImageCount: 5,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    new cdk.CfnOutput(this, "RepositoryUri", {
      value: this.repository.repositoryUri,
      exportName: "NodeApp3RepositoryUri",
    });
  }
}

// ── Stack 2: ECS + ALB ────────────────────────────────────────────────────────
// Runs after the image is pushed to ECR.
export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repository = ecr.Repository.fromRepositoryName(
      this,
      "Repository",
      "node-app-3"
    );

    const vpc = ec2.Vpc.fromLookup(this, "Vpc", { isDefault: true });

    const cluster = new ecs.Cluster(this, "Cluster", {
      clusterName: "node-app-3-cluster",
      vpc,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    const executionRole = new iam.Role(this, "ExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    });

    const logGroup = new logs.LogGroup(this, "LogGroup", {
      logGroupName: "/ecs/node-app-3",
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDef", {
      family: "node-app-3-task",
      cpu: 256,
      memoryLimitMiB: 512,
      executionRole,
    });

    taskDefinition.addContainer("app", {
      image: ecs.ContainerImage.fromEcrRepository(repository, "latest"),
      portMappings: [{ containerPort: 3000 }],
      environment: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      logging: ecs.LogDrivers.awsLogs({
        logGroup,
        streamPrefix: "app",
      }),
      healthCheck: {
        command: ["CMD-SHELL", "wget -qO- http://localhost:3000/health || exit 1"],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
      },
    });

    const alb = new elbv2.ApplicationLoadBalancer(this, "Alb", {
      vpc,
      internetFacing: true,
    });

    const listener = alb.addListener("Listener", {
      port: 80,
      open: true,
    });

    const service = new ecs.FargateService(this, "Service", {
      serviceName: "node-app-3-service",
      cluster,
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    listener.addTargets("EcsTarget", {
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: {
        path: "/health",
        interval: cdk.Duration.seconds(30),
        healthyHttpCodes: "200",
        healthyThresholdCount: 2,
      },
      deregistrationDelay: cdk.Duration.seconds(10),
    });

    new cdk.CfnOutput(this, "ClusterName", {
      value: cluster.clusterName,
      exportName: "NodeApp3ClusterName",
    });

    new cdk.CfnOutput(this, "ServiceName", {
      value: service.serviceName,
      exportName: "NodeApp3ServiceName",
    });

    new cdk.CfnOutput(this, "TaskDefinitionFamily", {
      value: taskDefinition.family,
      exportName: "NodeApp3TaskDefinitionFamily",
    });

    new cdk.CfnOutput(this, "AlbDnsName", {
      value: alb.loadBalancerDnsName,
      description: "Your app's public URL",
      exportName: "NodeApp3AlbDnsName",
    });
  }
}
