import AWS from "aws-sdk";
import { env } from "./config.js";
import { SemVer } from "semver";
import handlebars from "handlebars";
import { logger } from "@repo/logger";
import { isPresent } from "ts-is-present";
import { omitNullUndefined } from "./utils.js";

const eks = new AWS.EKS();

const getClusters = async () => {
  const clusters: string[] = [];
  let nextToken: string | undefined;

  do {
    const response = await eks.listClusters({ nextToken }).promise();
    clusters.push(...(response.clusters ?? []));
    nextToken = response.nextToken;
  } while (nextToken);

  return clusters;
};

const describeCluster = (name: string) =>
  eks
    .describeCluster({ name })
    .promise()
    .then((r) => r.cluster);

const template = handlebars.compile(env.CTRLPLANE_EKS_TARGET_NAME);
const deploymentTargetName = (cluster: AWS.EKS.Cluster) =>
  template({ cluster });

export const getClusterDeploymentTargets = async () => {
  logger.info("Scanning AWS EKS clusters");
  const clusterNames = (await getClusters()) ?? [];

  logger.info(`Found ${clusterNames.length} clusters`, {
    count: clusterNames.length,
  });

  const clusters = await Promise.all(
    clusterNames.map((name) => describeCluster(name))
  );

  return clusters.filter(isPresent).map((cluster) => {
    const masterVersion = new SemVer(cluster.version ?? "0");

    const appUrl = `https://console.aws.amazon.com/eks/home?region=${env.AWS_REGION}#/clusters/${cluster.name}`;
    return {
      name: deploymentTargetName(cluster),
      version: "kubernetes/v1",
      kind: "KubernetesAPI",
      provider: "AWS",
      config: {
        name: cluster.name,
        status: cluster.status,
        cluster: {
          certificateAuthorityData: cluster.certificateAuthority?.data,
          endpoint: cluster.endpoint,
        },
      },
      labels: omitNullUndefined({
        "ctrlplane/url": appUrl,

        "aws/arn": cluster.arn,
        "aws/region": env.AWS_REGION,

        "kubernetes/distribution": "eks",
        "kubernetes/status": cluster.status,
        "kubernetes/master-version": masterVersion.version,
        "kubernetes/master-version-major": String(masterVersion.major),
        "kubernetes/master-version-minor": String(masterVersion.minor),
        "kubernetes/master-version-patch": String(masterVersion.patch),

        ...(cluster.tags ?? {}),
      }),
    };
  });
};
