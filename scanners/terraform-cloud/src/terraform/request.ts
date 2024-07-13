import { AxiosInstance, AxiosRequestConfig } from "axios";

export interface Request<T, Attributes> {
  data: {
    type: T;
    attributes: Attributes;
  };
}

export interface Links {
  self?: string;
  related?: string;
  jsonOutput?: string;
}

export type Relationship = {
  data?: { id: string; type: string };
  links?: Links;
};

export interface Response<Attributes> {
  id: string;
  attributes: Attributes;
  relationships?: Record<string, Relationship>;
  links?: Links;
}

export abstract class TerraformRequest {
  constructor(protected client: AxiosInstance) {}

  protected async get<Entity>(
    path: string,
    config?: AxiosRequestConfig
  ): Promise<Entity> {
    const response = await this.client.get<Entity>(path, config);
    return response.data;
  }

  protected async patch<Entity, Request>(
    path: string,
    request: Request
  ): Promise<Entity> {
    const response = await this.client.patch<Request, Entity>(path, request);
    return response;
  }

  protected async post<Entity, Request>(
    path: string,
    request: Request
  ): Promise<Entity> {
    const response = await this.client.post<Request, { data: Entity }>(
      path,
      request
    );
    return response.data;
  }

  protected async delete(path: string): Promise<void> {
    return this.client.delete(path);
  }
}
