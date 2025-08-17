// 共通型
export interface ErrorResponse {
  error: {
    code: number;
    message: string;
    errors?: Array<{
      domain: string;
      reason: string;
      message: string;
      location_type: string;
      location: string;
    }>;
  };
  _log_url?: string;
}

// ----------------------------
// createApplication
// ----------------------------
export interface CreateApplicationRequest {
  name: string;
  port: number;
  timeout_seconds: number;
  min_scale: number;
  max_scale: number;
  components: ComponentSpec[];
}

export interface CreateApplicationResponse {
  id: string;
  name: string;
  timeout_seconds: number;
  port: number;
  min_scale: number;
  max_scale: number;
  components: ComponentSpec[];
  status: string;
  public_url: string;
  resource_id: string;
  created_at: string;
}

// ----------------------------
// patchApplication
// ----------------------------
export interface PatchApplicationRequest {
  name?: string;
  id?: string;
  port?: number;
  timeout_seconds?: number;
  min_scale?: number;
  max_scale?: number;
  components?: ComponentSpec[];
}

export interface PatchApplicationResponse {
  id: string;
  name: string;
  timeout_seconds: number;
  port: number;
  min_scale: number;
  max_scale: number;
  components: ComponentSpec[];
  status: string;
  public_url: string;
  resource_id: string;
  update_at: string;
}

export interface ComponentSpec {
  name: string;
  max_cpu: string;
  max_memory: string;
  deploy_source: {
    container_registry: {
      image: string;
      server?: string;
      username?: string;
      password?: string;
    };
  };
  env?: Array<Env>;
  probe?: Probe;
}

export interface Env {
  key: string;
  value: string;
}

export interface Probe {
  http_get?: {
    path: string;
    port: number;
    headers?: Array<Header>;
  };
}
export interface Header {
  name: string;
  value: string;
}
export interface Access {
  token: string;
  secret: string;
}

export interface GetAllApplicationResponse {
  data: Array<{
    id: string;
    name: string;
    status: string;
    public_url: string;
    created_at: string;
  }>;
}

export interface IApprunClient {
  createApplication(application: CreateApplicationRequest): Promise<CreateApplicationResponse>;
  getAllApplication(): Promise<GetAllApplicationResponse>;
  patchApplication(application: PatchApplicationRequest): Promise<PatchApplicationResponse>;
}
