import k8s from "@kubernetes/client-node";

import { env } from "./config.js";

const getKubeConfig = (configPath?: string | null) => {
  const kc = new k8s.KubeConfig();
  if (configPath) {
    console.log(`Loading config from file ${configPath}`);
    kc.loadFromFile(configPath);
    return kc;
  }

  console.log(`Loading config from default.`);
  kc.loadFromDefault();
  return kc;
};

let _client: k8s.BatchV1Api | null = null;
export const getBatchClient = () => {
  if (_client) return _client;

  const kc = getKubeConfig(env.KUBE_CONFIG_PATH);
  const cu = kc.getCurrentUser();
  console.log("Current user: ", cu?.name ?? cu?.username ?? "unknown");

  console.log("Creating BatchV1Api client...");
  const batchapi = kc.makeApiClient(k8s.BatchV1Api);

  console.log("Batch V1 API client created.");
  _client = batchapi;

  return batchapi;
};

export const getJobStatus = async (namespace: string, name: string) => {
  try {
    const { body } = await getBatchClient().readNamespacedJob(name, namespace);
    const { failed = 0, succeeded = 0, active = 0 } = body.status ?? {};
    if (failed > 0) return { status: "failure" as const, message: "" };
    if (active > 0) return { status: "in_progress" as const, message: "" };
    if (succeeded > 0) return { status: "completed" as const, message: "" };
    return {};
  } catch (e: any) {
    return {
      status: "invalid_job_dispatcher" as const,
      message: e.body.message,
    };
  }
};
