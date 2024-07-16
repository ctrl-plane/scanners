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
        executionId: jobExecutionId,
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
      executionId: jobExecutionId,
      updateJobExecutionRequest: {
        status: "in_progress",
        externalRunId: `${namespace}/${name}`,
        message: null,
      },
    });
  } catch (e: any) {
    console.log(e);
    await api.updateJobExecution({
      executionId: jobExecutionId,
      updateJobExecutionRequest: {
        status: "invalid_job_dispatcher",
        message: e.body.message,
      },
    });
  }
};

const spinUpNewJobs = async (dispatcherId: string) => {
  const { jobExecutions = [] } = await api.getNextJobs({ dispatcherId });
  logger.info(`Found ${jobExecutions.length} jobExecution(s) to run.`);
  await Promise.allSettled(
    jobExecutions.map(async (jobExecution) => {
      logger.info(`Running job execution ${jobExecution.id}`);
      try {
        const je = await api.getJobExecution({ executionId: jobExecution.id });
        const manifest = renderManifest(
          (jobExecution.jobDispatcherConfig as any).manifest,
          je
        );
        const namespace = manifest?.metadata?.namespace ?? env.KUBE_NAMESPACE;
        await api.acknowledgeJob({ executionId: jobExecution.id });
        await deployManifest(jobExecution.id, namespace, manifest);
      } catch (e: any) {
        console.log(e);
      }
    })
  );
};

const updateExecutionStatus = async (dispatcherId: string) => {
  const executions = await api.getDispatcherRunningExecutions({ dispatcherId });
  logger.info(`Found ${executions.length} running execution(s)`);
  await Promise.allSettled(
    executions.map(async (exec) => {
      const [namespace, name] = exec.externalRunId?.split("/") ?? "";
      if (namespace == null || name == null) {
        console.error("Invalid external run ID.");
        return;
      }

      logger.debug(`Checking status of ${namespace}/${name}`);
      const { status, message } = await getJobStatus(namespace, name);
      await api.updateJobExecution({
        executionId: exec.id,
        updateJobExecutionRequest: { status, message },
      });
    })
  );
};

const scan = async () => {
  const { id } = await api.updateJobDispatcher({
    workspace: env.CTRLPLANE_WORKSPACE,
    updateJobDispatcherRequest: {
      name: env.CTRLPLANE_DISPATCHER_NAME,
      type: "kubernetes-job",
    },
  });

  logger.info(`Dispatcher ID: ${id}`);
  await spinUpNewJobs(id);
  await updateExecutionStatus(id);
};

scan().catch(console.error);
if (env.CRON_ENABLED) new CronJob(env.CRON_TIME, scan).start();
