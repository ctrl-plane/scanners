import Container from "@google-cloud/container";
import { CronJob } from "cron";
import { env } from "./config.js";
import { SemVer } from "semver";
import handlebars from "handlebars";

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
    })
  );
};

const scanGke = new CronJob(
  "* * * * *", // min
  scan
);

scan().catch(console.error);
scanGke.start();
