import { CronJob } from "cron";
import { env } from "./config.js";
import { api } from "./api.js";
import { logger } from "@repo/logger";

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

  for (const job of jobExecutions) {
    await api.acknowledgeJob({
      dispatcherId: id,
      acknowledgeJobRequest: { jobExecutionId: job.id },
    });
  }
};

scan().catch(console.error);
if (env.CRON_ENABLED) new CronJob(env.CRON_TIME, scan).start();
