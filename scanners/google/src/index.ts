import Container from "@google-cloud/container";
import { CronJob } from "cron";
import { env } from "./config.js";
import { SemVer } from "semver";
import handlebars from "handlebars";
import { api } from "./api.js";

const clusterClient = new Container.v1.ClusterManagerClient();

const getClusters = async () => {
  const request = { parent: `projects/${env.GOOGLE_PROJECT_ID}/locations/-` };
  const [response] = await clusterClient.listClusters(request);
  const { clusters } = response;
  return clusters;
};

const template = handlebars.compile(env.CTRLPLANE_TARGET_NAME);
const deploymentTargetName = (
  cluster: Container.protos.google.container.v1.ICluster
) => template({ cluster, projectId: env.GOOGLE_PROJECT_ID });

function omitNullUndefined(obj: object) {
  // Use Object.entries to get key-value pairs, then filter and reduce
  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      // Add the key-value pair to the accumulator if the value is neither null nor undefined
      if (value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, string>
  );
}

const scan = async () => {
  const clusters = (await getClusters()) ?? [];

  await Promise.allSettled(
    clusters.map(async (cluster) => {
      console.log(`Found cluster ${cluster.name}`);

      const masterVersion = new SemVer(cluster.currentMasterVersion ?? "0");
      const nodeVersion = new SemVer(cluster.currentNodeVersion ?? "0");
      const autoscaling = String(
        cluster.autoscaling?.enableNodeAutoprovisioning ?? false
      );

      const appUrl = `https://console.cloud.google.com/kubernetes/clusters/details/${cluster.location}/${cluster.name}/details?project=${env.GOOGLE_PROJECT_ID}`;
      const name = deploymentTargetName(cluster);
      const deploymentTarget = {
        name: deploymentTargetName(cluster),
        version: "kubernetes/v1",
        kind: "KubernetesAPI",
        provider: "GoogleCloud",
        config: {
          name: cluster.name,
          status: cluster.status,
          cluster: {
            certificateAuthorityData: cluster.masterAuth?.clusterCaCertificate,
            endpoint: `https://${cluster.endpoint}`,
          },
        },
        labels: {
          "ctrlplane/url": appUrl,

          "google/self-link": cluster.selfLink,
          "google/project-id": env.GOOGLE_PROJECT_ID,
          "google/gke-location": cluster.location,

          "kubernetes.io/distribution": "gke",
          "kubernetes.io/status": cluster.status,
          "kubernetes.io/node-count": String(cluster.currentNodeCount ?? 0),

          "kubernetes/master-version": masterVersion.version,
          "kubernetes/master-version-major": String(masterVersion.major),
          "kubernetes/master-version-minor": String(masterVersion.minor),
          "kubernetes/master-version-patch": String(masterVersion.patch),

          "kubernetes/node-version": nodeVersion.version,
          "kubernetes/node-version-major": String(nodeVersion.major),
          "kubernetes/node-version-minor": String(nodeVersion.minor),
          "kubernetes/node-version-patch": String(nodeVersion.patch),

          "kubernetes.io/autoscaling-enabled": autoscaling,

          ...(cluster.resourceLabels ?? {}),
        },
      };
      api.updateDeploymentTargetByName({
        name,
        workspace: env.CTRLPLANE_WORKSPACE,
        updateDeploymentTargetByNameRequest: {
          ...deploymentTarget,
          labels: omitNullUndefined(deploymentTarget.labels),
        },
      });
    })
  );
};

const scanGke = new CronJob(
  "* * * * *", // min
  scan
);

scan().catch(console.error);
scanGke.start();
