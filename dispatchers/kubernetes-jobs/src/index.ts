import { CronJob } from "cron";
import { env } from "./config.js";
import { api } from "./api.js";
import { getBatchClient, getJobStatus } from "./k8s.js";

import { logger } from "@repo/logger";
import handlebars from "handlebars";
import yaml from "js-yaml";

const renderManifest = (manifestTemplate: string, variables: object) => {
  const template = handlebars.compile(manifestTemplate);
  const manifestYaml = template(variables);
  return yaml.load(manifestYaml) as any;
};

const deployManifest = async (
  jobExecutionId: string,
  namespace: string,
  manifest: any
) => {
  try {
    const name = manifest?.metadata?.name;
    console.log(`Deploying manifest: ${namespace}/${name}`);
    if (name == null) {
      await api.updateJobExecution({
        excutionId: jobExecutionId,
        updateJobExecutionRequest: {
          status: "invalid_job_dispatcher",
          message: "Job name not found.",
        },
      });
      return;
    }

    console.log(`Creating job - ${namespace}/${name}`);
    await getBatchClient().createNamespacedJob(namespace, manifest);
    await api.updateJobExecution({
      excutionId: jobExecutionId,
      updateJobExecutionRequest: {
        status: "in_progress",
        externalRunId: `${namespace}/${name}`,
        message: null,
      },
    });
  } catch (e: any) {
    console.log(e);
    await api.updateJobExecution({
      excutionId: jobExecutionId,
      updateJobExecutionRequest: {
        status: "invalid_job_dispatcher",
        message: e.body.message,
      },
    });
  }
};

const scan = async () => {
  const { id } = await api.updateJobDispatcher({
    workspace: env.CTRLPLANE_WORKSPACE,
    updateJobDispatcherRequest: {
      name: env.CTRLPLANE_DISPATCHER_NAME,
      type: "kubernetes-jobs",
    },
  });

  logger.info("Dispatcher ID", { id });
  const { jobExecutions = [] } = await api.getNextJobs({
    dispatcherId: env.CTRLPLANE_WORKSPACE,
  });

  console.log(`[*] Found ${jobExecutions.length} jobExecution(s) to run.`);
  await Promise.allSettled(
    jobExecutions.map(async (jobExecution) => {
      console.log("[*] Running job execution", jobExecution.id);
      const manifest = renderManifest(
        (jobExecution.jobDispatcherConfig as any).manifest,
        jobExecution
      );
      const namespace = manifest?.metadata?.namespace ?? env.KUBE_NAMESPACE;
      await api.acknowledgeJob({
        dispatcherId: id,
        acknowledgeJobRequest: { jobExecutionId: jobExecution.id },
      });
      await deployManifest(jobExecution.id, namespace, manifest);
    })
  );
};

scan().catch(console.error);
if (env.CRON_ENABLED) new CronJob(env.CRON_TIME, scan).start();
