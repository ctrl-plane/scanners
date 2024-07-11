import { CronJob } from "cron";
import { env } from "./config.js";
import { api } from "./api.js";
import { logger } from "@repo/logger";
import { getClusterDeploymentTargets } from "./gke.js";
import { getInstanceTargets } from "./compute.js";

const scan = async () => {
  const { id } = await api.upsertTargetProvider({
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

  logger.info(`Scanner ID: ${id}`, { id });

  const clusterTargets = await getClusterDeploymentTargets();
  const computeTargets = await getInstanceTargets();
  const targets = [...clusterTargets, ...computeTargets];
  logger.info(`Sending ${targets.length} target(s) to CtrlPlane`, {
    count: targets.length,
  });

  await api.setTargetProvidersTargets({
    workspace: env.CTRLPLANE_WORKSPACE,
    providerId: id,
    setTargetProvidersTargetsRequest: { targets },
  });
};

scan().catch(console.error);
if (env.CRON_ENABLED) new CronJob(env.CRON_TIME, scan).start();
