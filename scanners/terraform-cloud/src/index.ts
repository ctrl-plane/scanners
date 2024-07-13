import { CronJob } from "cron";
import { env } from "./config.js";
import { api } from "./api.js";
import { logger } from "@repo/logger";
import { ScannerFunc } from "./utils.js";
import { terraform } from "./terraform/index.js";

const getWorkspaces: ScannerFunc = async () => {
  const workspaces = terraform.workspaces.list(env.TERRAFORM_CLOUD_ORG_NAME);
  console.log(workspaces);
  return [];
};

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

  const workspaceTargets = await getWorkspaces();
  const targets = [...workspaceTargets, ...workspaceTargets];
  logger.info(
    `Sending ${targets.length} terraform workspace target(s) to CtrlPlane`,
    { count: targets.length }
  );

  await api.setTargetProvidersTargets({
    workspace: env.CTRLPLANE_WORKSPACE,
    providerId: id,
    setTargetProvidersTargetsRequest: { targets },
  });
};

scan().catch(console.error);
if (env.CRON_ENABLED) new CronJob(env.CRON_TIME, scan).start();
