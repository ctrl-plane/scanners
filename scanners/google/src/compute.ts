import compute from "@google-cloud/compute";
import { env } from "./config.js";
import handlebars from "handlebars";
import { logger } from "@repo/logger";
import { ScannerFunc, omitNullUndefined } from "./utils.js";

const getInstances = async () => {
  const instancesClient = new compute.InstancesClient();
  const aggListRequest = instancesClient.aggregatedListAsync({
    project: env.GOOGLE_PROJECT_ID,
    maxResults: 20,
  });

  const vms: compute.protos.google.cloud.compute.v1.IInstance[] = [];
  for await (const [zone, instancesObject] of aggListRequest) {
    const instances = instancesObject.instances;
    if (instances && instances.length > 0)
      for (const instance of instances) vms.push(instance);
  }
  return vms;
};

const template = handlebars.compile(env.CTRLPLANE_COMPUTE_TARGET_NAME);
const targetName = (vm: compute.protos.google.cloud.compute.v1.IInstance) =>
  template({ vm, projectId: env.GOOGLE_PROJECT_ID });

export const getInstanceTargets: ScannerFunc = async () => {
  logger.info("Scanning Google Cloud Compute instances");
  const instances = await getInstances();

  logger.info(`Found ${instances.length} instances`, {
    count: instances.length,
  });

  return instances.map((instance) => {
    const appUrl = `https://console.cloud.google.com/compute/instancesDetail/zones/${instance.zone}/instances/${instance.name}?project=${env.GOOGLE_PROJECT_ID}`;
    return {
      name: targetName(instance),
      version: "compute/v1",
      kind: "ComputeEngine",
      provider: "GoogleCloud",
      config: {
        name: instance.name!,
        status: instance.status!,
        instance: {
          id: instance.id!,
          machineType: instance.machineType!,
          zone: instance.zone!,
        },
      },
      labels: omitNullUndefined({
        "ctrlplane/url": appUrl,

        "google/self-link": instance.selfLink,
        "google/project-id": env.GOOGLE_PROJECT_ID,
        "google/zone": instance.zone,
        "google/instance-status": instance.status,

        "google-compute/cpu-platform": instance.cpuPlatform,
        "google-compute/macheine-type": instance.status,
        "google-compute/network-interfaces":
          instance.networkInterfaces?.length ?? 0,

        ...(instance.labels ?? {}),
      }),
    };
  });
};
