import { Response, TerraformRequest } from "./request.js";

export type WorkspaceAttributes = {
  name: string;
  "agent-pool-id"?: string;
  "allow-destroy-plan"?: boolean;
  "auto-apply"?: boolean;
  description?: string;
  "working-directory"?: string;
  "execution-mode"?: "remote" | "local" | "agent";
  "file-triggers-enabled"?: boolean;
  "global-remote-state"?: boolean;
  "queue-all-runs"?: boolean;
  "source-name"?: string;
  "source-url"?: string;
  "speculative-enabled"?: boolean;
  terraform_version?: string;
  "trigger-prefixes"?: string[];
  "vcs-repo"?: {
    "oauth-token-id": string;
    branch?: string;
    "ingress-submodules"?: boolean;
    identifier: string;
  };
};

export type Workspace = Response<{
  actions: {
    isDestroyable: boolean;
  };
  allowDestroyPlan: boolean;
  applyDurationAverage: any;
  autoApply: boolean;
  autoDestroyAt: any;
  createdAt: string;
  description: any;
  environment: string;
  executionMode: string;
  fileTriggersEnabled: boolean;
  globalRemoteState: boolean;
  latestChangeAt: string;
  locked: boolean;
  name: string;
  operations: boolean;
  planDurationAverage: any;
  policyCheckFailures: any;
  queueAllRuns: boolean;
  resourceCount: number;
  runFailures: any;
  source: string;
  sourceName: any;
  sourceUrl: any;
  speculativeEnabled: boolean;
  structuredRunOutputEnabled: boolean;
  terraformVersion: string;
  triggerPrefixes: any[];
  updatedAt: string;
  vcsRepo: {
    branch: string;
    displayIdentifier: string;
    identifier: string;
    ingressSubmodules: boolean;
    oauthTokenId: string;
    repositoryHttpUrl: string;
    serviceProvider: string;
    webhookUrl: string;
  } | null;
  permissions: Record<string, boolean | undefined>;
  vcsRepoIdentifier: string | null;
  workingDirectory: string;
  workspaceKpisRunsCount: any;
}>;

export class TerraformWorkspaces extends TerraformRequest {
  list(orgName: string) {
    const url = `/api/v2/organizations/${orgName}/workspaces`;
    return this.get<Workspace[]>(url);
  }

  show(workspaceId: string) {
    const url = `/api/v2/workspaces/${workspaceId}`;
    return this.get<Workspace>(url);
  }

  async tags(worskacepId: string, name: string[]) {
    const url = `/api/v2/workspaces/${worskacepId}/relationships/tags`;
    await this.post(url, {
      data: name.map((n) => ({ type: "tags", attributes: { name: n } })),
    });
    return;
  }
}
