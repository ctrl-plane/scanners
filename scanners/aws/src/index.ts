import { CronJob } from "cron";
import { env } from "./config.js";
import { api } from "./api.js";
import { logger } from "@repo/logger";

const scan = async () => {
  const { id } = await api.getProviderByName({
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

  const clusterTargets = [];
  const targets = [...clusterTargets];
  logger.info("Sending targets to CtrlPlane", {
    count: targets.length,
  });

  await api.setProvidersTargets({
    workspace: env.CTRLPLANE_WORKSPACE,
    scannerId: id,
    setProvidersTargetsRequestInner: targets,
  });
};

scan().catch(console.error);
if (env.CRON_ENABLED) new CronJob(env.CRON_TIME, scan).start();
