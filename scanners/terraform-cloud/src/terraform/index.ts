import axios, { AxiosInstance, AxiosResponse } from "axios";
import camelcaseKeys from "camelcase-keys";

import { env } from "../config.js";

import { TerraformOrganizations } from "./organization.js";
import { TerraformVariables } from "./variables.js";
import { TerraformWorkspaces } from "./workspaces.js";

const createClient = (apiUrl?: string, apiKey?: string): AxiosInstance => {
  apiUrl = apiUrl ?? env.TERRAFORM_CLOUD_API_URL;
  apiKey = apiKey ?? env.TERRAFORM_CLOUD_API_KEY;

  const client: AxiosInstance = axios.create({ baseURL: apiUrl });
  client.interceptors.request.use((req) => {
    req.headers.set("Authorization", `Bearer ${apiKey}`);
    req.headers.set("Accept", `application/json`);
    req.headers.set("Content-Type", `application/vnd.api+json`);
    return req;
  });

  client.interceptors.response.use((res: AxiosResponse) =>
    camelcaseKeys(res.data, { deep: true })
  );

  return client;
};

type LogFile = {
  first_index: number;
  last_index: number;
  size: number;
  data: string;
};

class TerraformClient {
  organzations: TerraformOrganizations;
  variables: TerraformVariables;
  workspaces: TerraformWorkspaces;

  constructor(baseUrl?: string, token?: string) {
    const client = createClient(baseUrl, token);

    this.organzations = new TerraformOrganizations(client);
    this.variables = new TerraformVariables(client);
    this.workspaces = new TerraformWorkspaces(client);
  }

  async logFile(url: string) {
    try {
      const logs = await axios.get<LogFile>(url, {
        headers: { accept: "application/json" },
      });
      return logs?.data?.data
        .split(/\r?\n/)
        .map((s) => {
          try {
            return JSON.parse(s);
          } catch (e) {
            return null;
          }
        })
        .filter((s) => s != null);
    } catch {
      return [];
    }
  }
}

export const terraform = new TerraformClient();
