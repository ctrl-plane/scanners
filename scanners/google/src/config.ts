import { createEnv } from "@t3-oss/env-core";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const env = createEnv({
  server: {
    CTRLPLANE_API_URL: z.string().default("http://localhost:3000"),
    CTRLPLANE_API_KEY: z.string().default(""),
    CTRLPLANE_WORKSPACE: z.string().default("default"),
    CTRLPLANE_SCANNER_NAME: z.string().default("google"),
    CTRLPLANE_TARGET_NAME: z
      .string()
      .default("gke-{{ project }}-{{ cluster.name }}"),

    CRON_ENABLED: z.boolean().default(true),
    CRON_TIME: z.string().default("* * * * *"),

    GOOGLE_PROJECT_ID: z.string().min(1),
    GOOGLE_SCAN_GKE: z.boolean().default(true),
  },
  runtimeEnv: process.env,
});
