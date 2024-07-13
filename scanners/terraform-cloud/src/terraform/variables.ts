import { Response, TerraformRequest } from "./request.js";

export type VariableAttributes = {
  key: string;
  value: string;
  description?: string;
  sensitive?: boolean;
  category: string;
  hcl?: boolean;
};

export type Variable = Response<{
  key: string;
  value: string;
  description: string;
  sensitive: boolean;
  category: string;
  hcl: boolean;
}>;

export class TerraformVariables extends TerraformRequest {
  create(workspaceId: string, attributes: VariableAttributes) {
    const url = `/api/v2/vars`;
    return this.post<Variable, any>(url, {
      data: {
        type: "vars",
        attributes,
        relationships: {
          workspace: {
            data: { type: "workspaces", id: workspaceId },
          },
        },
      },
    });
  }

  update(variableId: string, attributes: Partial<VariableAttributes>) {
    const url = `/api/v2/vars/${variableId}`;
    return this.patch<Variable, any>(url, {
      data: { type: "organizations", attributes },
    });
  }

  remove(variableId: string) {
    const url = `/api/v2/vars/${variableId}`;
    return this.delete(url);
  }

  list(workspaceId: string) {
    const url = `/api/v2/workspaces/${workspaceId}/vars`;
    return this.get<Variable[]>(url);
  }
}
