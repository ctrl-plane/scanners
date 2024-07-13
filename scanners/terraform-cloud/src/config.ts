import { createEnv } from "@t3-oss/env-core";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const env = createEnv({
  server: {
    CTRLPLANE_API_URL: z.string().default("http://localhost:3000"),
    CTRLPLANE_API_KEY: z.string(),
    CTRLPLANE_WORKSPACE: z.string(),
    CTRLPLANE_SCANNER_NAME: z.string().default("offical-tfc-scanner"),
    CTRLPLANE_TARGET_NAME: z.string().default("tfc-{{ workspace.name }}"),

    CRON_ENABLED: z.boolean().default(true),
    CRON_TIME: z.string().default("* * * * *"),

    TERRAFORM_CLOUD_API_KEY: z.string().min(1),
    TERRAFORM_CLOUD_API_URL: z
      .string()
      .url()
      .default("https://app.terraform.io"),
    TERRAFORM_CLOUD_ORG_NAME: z.string().min(1),
  },
  runtimeEnv: process.env,
});
