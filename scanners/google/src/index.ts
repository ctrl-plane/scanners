import Container from "@google-cloud/container";
import { CronJob } from "cron";
import { env } from "./config.js";
import { SemVer } from "semver";
import handlebars from "handlebars";
import { api } from "./api.js";
import { logger } from "@repo/logger";

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
  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      if (value !== null && value !== undefined) acc[key] = value;
      return acc;
    },
    {} as Record<string, string>
  );
}

const scan = async () => {
  const { id } = await api.getScannerByName({
    workspace: env.CTRLPLANE_WORKSPACE,
    name: env.CTRLPLANE_SCANNER_NAME,
  });

  if (id == null) {
    logger.error("Scanner not found", {
      workspace: env.CTRLPLANE_WORKSPACE,
      name: env.CTRLPLANE_SCANNER_NAME,
    });
    return;
  }

  logger.info("Scanner ID", { id });

  logger.info("Scanning Google Cloud GKE clusters");
  const clusters = (await getClusters()) ?? [];

  logger.info(`Found ${clusters.length} clusters`, { count: clusters.length });

  const deploymentTargets = clusters.map((cluster) => {
    const masterVersion = new SemVer(cluster.currentMasterVersion ?? "0");
    const nodeVersion = new SemVer(cluster.currentNodeVersion ?? "0");
    const autoscaling = String(
      cluster.autoscaling?.enableNodeAutoprovisioning ?? false
    );

    const appUrl = `https://console.cloud.google.com/kubernetes/clusters/details/${cluster.location}/${cluster.name}/details?project=${env.GOOGLE_PROJECT_ID}`;
    return {
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
      labels: omitNullUndefined({
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
      }),
    };
  });

  logger.info("Sending deployment targets to CtrlPlane", {
    count: deploymentTargets.length,
  });

  await api.setScannersDeploymentTarget({
    workspace: env.CTRLPLANE_WORKSPACE,
    scannerId: id,
    setScannersDeploymentTargetRequestInner: deploymentTargets,
  });
};

scan().catch(console.error);
if (env.CRON_ENABLED) new CronJob(env.CRON_TIME, scan).start();
