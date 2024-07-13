import { Response, TerraformRequest } from "./request.js";

export type OrganizationAttributes = {
  name: string;
  email: string;
};

export type Organization = Response<{
  id: string;
  type: string;
  attributes: {
    externalId: string;
    createdAt: string;
    email: string;
    collaboratorAuthPolicy: string;
    planExpired: boolean;
    planExpiresAt: any;
    planIsTrial: boolean;
    planIsEnterprise: boolean;
    costEstimationEnabled: boolean;
    name: string;
    permissions: {
      canUpdate: boolean;
      canDestroy: boolean;
      canAccessViaTeams: boolean;
      canCreateModule: boolean;
      canCreateTeam: boolean;
      canCreateWorkspace: boolean;
      canManageUsers: boolean;
      canManageSubscription: boolean;
      canManageSso: boolean;
      canManageTags: boolean;
    };
  };
}>;

export class TerraformOrganizations extends TerraformRequest {
  create(attributes: OrganizationAttributes) {
    const url = `/api/v2/organizations`;
    return this.post<Organization, any>(url, {
      data: { type: "organizations", attributes },
    });
  }

  update(orgName: string, attributes: Partial<OrganizationAttributes>) {
    const url = `/api/v2/organizations/${orgName}`;
    return this.patch<Organization, any>(url, {
      data: { type: "organizations", attributes },
    });
  }

  remove(orgName: string) {
    const url = `/api/v2/organizations/${orgName}`;
    return this.delete(url);
  }

  async show(orgName: string) {
    const url = `/api/v2/organizations/${orgName}`;
    return this.get<Organization>(url);
  }
}
