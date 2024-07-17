import { createEnv } from "@t3-oss/env-core";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const env = createEnv({
  server: {
    CTRLPLANE_API_URL: z.string().default("http://localhost:3000"),
    CTRLPLANE_API_KEY: z.string(),

    CTRLPLANE_WORKSPACE: z.string(),
    CTRLPLANE_AGENT_NAME: z.string(),

    CRON_ENABLED: z.boolean().default(true),
    CRON_TIME: z.string().default("* * * * *"),

    KUBE_CONFIG_PATH: z.string().optional(),
    KUBE_NAMESPACE: z.string().default("default"),
  },
  runtimeEnv: process.env,
});
