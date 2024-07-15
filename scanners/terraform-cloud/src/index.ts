import { CronJob } from "cron";
import { env } from "./config.js";
import { api } from "./api.js";
import { logger } from "@repo/logger";
import { ScannerFunc } from "./utils.js";
import { terraform } from "./terraform/index.js";
import { Workspace } from "./terraform/workspaces.js";

const getWorkspaces: ScannerFunc = async () => {
  let page = 1;
  const pageSize = 10;
  const workspaces: Workspace[] = [];
  for (;;) {
    const ws = await terraform.workspaces.list(env.TERRAFORM_CLOUD_ORG_NAME, {
      "page[number]": page,
      "page[size]": pageSize,
    });
    workspaces.push(...ws);
    if (ws.length !== pageSize) break;
    page++;
  }

  return workspaces.map((ws) => {
    const tagNames = Object.fromEntries(
      ws.attributes.tagNames.map((tag) => [
        `terraform-cloud/tag-${tag.toLowerCase()}`,
        tag.toLowerCase(),
      ])
    );
    return {
      name: ws.attributes.name,
      version: "terraform/v1",
      kind: "TerraformCloudWorkspace",
      provider: "TerraformCloud",
      config: {
        org: env.TERRAFORM_CLOUD_ORG_NAME,
        workspace: ws.attributes.name,
      },
      labels: {
        "terraform-cloud/workspace-id": ws.id,
        "terraform-cloud/organization-name": env.TERRAFORM_CLOUD_ORG_NAME,
        "terraform-cloud/terraform-version": ws.attributes.terraformVersion,
        "terraform-cloud/auto-apply": String(ws.attributes.autoApply),
        ...tagNames,
      },
    };
  });
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
  const targets = workspaceTargets;
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
