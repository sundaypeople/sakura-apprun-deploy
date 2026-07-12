import { run } from '../src/main';
import { setFailed } from '@actions/core';
import { patchPacketFilter, createApplication, getApplication, patchApplication, getAllApplication } from '../src/apprun-client';
import { vi, describe, afterEach, test, expect } from 'vitest';

import * as model from '../src/model';
vi.mock('@actions/core', { spy: true });

interface TestCase {
  name: string;
  input: Record<string, string>;
  expectedOutput?: string;
  expectedOutputPacketFilter?: string;
  expectedError?: string;
}

function setEnvProxyActions(input: Record<string, string>) {
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      const envKey = `INPUT_${key.toUpperCase()}`;
      vi.stubEnv(envKey, value);
    }
  }
}

const existApplication = {
  id: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cd',
  name: 'test-application',
  timeout_seconds: 80,
  port: 80,
  max_scale: 2,
  min_scale: 0,
  components: [
    {
      name: 'aaaa',
      max_cpu: '2',
      max_memory: '512Mi',
      deploy_source: {
        container_registry: {
          image: 'aaaa',
          server: 'aaaa',
          username: 'aaaa',
        },
      },
      env: [
        {
          key: 'NODE_ENV',
          value: 'dev',
        },
      ],
      secret: [
        {
          key: 'DB_PASSWORD',
        },
      ],
    },
  ],
  status: 'Healthy',
  resource_id: '100000000000',
  update_at: '2019-08-24T14:15:22Z',
  public_url: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc.apprun.sakura.ne.jp',
};

vi.mock('../src/apprun-client');
vi.mocked(createApplication).mockImplementation(async (client, application) => {
  const result: model.CreateApplicationResponse = {
    id: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc',
    port: 8080,
    name: application.name,
    timeout_seconds: application.timeout_seconds,
    min_scale: application.min_scale,
    max_scale: application.max_scale,
    components: application.components,
    status: 'Healthy',
    public_url: 'https://0e63e868-ee29-4cd2-bbd1-79f3c10d19cc.ingress.apprun.sakura.ne.jp',
    resource_id: '113801554991',
    created_at: new Date().toISOString(),
  };
  return result;
});
vi.mocked(patchApplication).mockImplementation(async (client, application) => {
  const result: model.PatchApplicationResponse = {
    id: existApplication.id,
    name: application.name || existApplication.name,
    timeout_seconds: application.timeout_seconds || existApplication.timeout_seconds,
    port: application.port || existApplication.port,
    min_scale: application.min_scale || existApplication.min_scale,
    max_scale: application.max_scale || existApplication.max_scale,
    components: application.components || [
      {
        name: existApplication.components[0].name,
        max_cpu: existApplication.components[0].max_cpu,
        max_memory: existApplication.components[0].max_memory,
        deploy_source: existApplication.components[0].deploy_source,
      },
    ],
    status: 'Healthy',
    public_url: existApplication.public_url,
    resource_id: existApplication.resource_id,
    update_at: new Date().toISOString(),
  };
  return result;
});
vi.mocked(getApplication).mockImplementation(async (client, applicationID) => {
  return existApplication;
});
vi.mocked(getAllApplication).mockImplementation(async (client) => {
  const result: model.GetAllApplicationResponse = {
    data: [
      {
        id: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc',
        name: 'test-application',
        status: 'Healthy',
        public_url: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc.apprun.sakura.ne.jp',
        created_at: '2019-08-24T14:15:22Z',
      },
    ],
  };
  return result;
});
vi.mocked(patchPacketFilter).mockImplementation(async (client, applicationID, request) => {
  const result: model.PatchPacketFilterResponse = {
    is_enabled: request.is_enabled,
    settings: request.settings,
  };
  return result;
});

describe('main.ts', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  describe('CreateApplication', () => {
    const testCase: TestCase[] = [
      {
        name: 'Success with minimum required inputs',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          inherit_env: 'false',
          packet_filter_enabled: 'false',
        },
        expectedOutput: {
          components: [
            {
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', password: undefined, server: undefined, username: undefined } },
              env: undefined,
              max_cpu: '0.5',
              max_memory: '1Gi',
              name: 'test',
              probe: undefined,
            },
          ],
          max_scale: 10,
          min_scale: 0,
          name: 'test',
          port: 80,
          timeout_seconds: 30,
        },
      },
      {
        name: 'Success with full options',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test',
          timeout_seconds: '500',
          port: '80',
          min_scale: '1',
          max_scale: '2',
          image: 'nginx.sakuracr.jp/nginx:latest',
          server: 'container.qpid.com',
          container_registry_username: 'username',
          container_registry_password: 'password',
          components_name: 'componentName',
          max_cpu: '1',
          max_memory: '1Gi',
          env: `NODE_ENV: "production"
LOG_LEVEL: "info"`,
          inherit_env: 'false',
          probe_path: '/',
          probe_port: '80',
          probe_headers: `NODE_ENV: "production"
LOG_LEVEL: "info"`,
          packet_filter_enabled: 'true',
          packet_filter_allowlist: `0.0.0.0/0
1.1.1.1/32`,
        },
        expectedOutput: {
          components: [
            {
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', password: 'password', server: 'container.qpid.com', username: 'username' } },
              env: [
                {
                  key: 'NODE_ENV',
                  value: 'production',
                },
                {
                  key: 'LOG_LEVEL',
                  value: 'info',
                },
              ],
              max_cpu: '1',
              max_memory: '1Gi',
              name: 'componentName',
              probe: {
                http_get: {
                  path: '/',
                  port: 80,
                  headers: [
                    { name: 'NODE_ENV', value: 'production' },
                    { name: 'LOG_LEVEL', value: 'info' },
                  ],
                },
              },
            },
          ],
          max_scale: 2,
          min_scale: 1,
          name: 'test',
          port: 80,
          timeout_seconds: 500,
        },
      },
      {
        name: 'Success with full options inherit_env',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test',
          timeout_seconds: '500',
          port: '80',
          min_scale: '1',
          max_scale: '2',
          image: 'nginx.sakuracr.jp/nginx:latest',
          server: 'container.qpid.com',
          container_registry_username: 'username',
          container_registry_password: 'password',
          components_name: 'componentName',
          max_cpu: '1',
          max_memory: '1Gi',
          env: `NODE_ENV: "production"
LOG_LEVEL: "info"`,
          inherit_env: 'true',
          probe_path: '/',
          probe_port: '80',
          probe_headers: `NODE_ENV: "production"
LOG_LEVEL: "info"`,
          packet_filter_enabled: 'true',
          packet_filter_allowlist: `0.0.0.0/0
1.1.1.1/32`,
        },
        expectedOutput: {
          components: [
            {
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', password: 'password', server: 'container.qpid.com', username: 'username' } },
              env: [
                {
                  key: 'NODE_ENV',
                  value: 'production',
                },
                {
                  key: 'LOG_LEVEL',
                  value: 'info',
                },
              ],
              max_cpu: '1',
              max_memory: '1Gi',
              name: 'componentName',
              probe: {
                http_get: {
                  path: '/',
                  port: 80,
                  headers: [
                    { name: 'NODE_ENV', value: 'production' },
                    { name: 'LOG_LEVEL', value: 'info' },
                  ],
                },
              },
            },
          ],
          max_scale: 2,
          min_scale: 1,
          name: 'test',
          port: 80,
          timeout_seconds: 500,
        },
        expectedOutputPacketFilter: {
          is_enabled: true,
          settings: [
            {
              from_ip: '0.0.0.0',
              from_ip_prefix_length: 0,
            },
            {
              from_ip: '1.1.1.1',
              from_ip_prefix_length: 32,
            },
          ],
        },
      },
      {
        name: 'Success parsing hierarchical image path',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/another/nginx:latest',
          inherit_env: 'false',
          packet_filter_enabled: 'false',
        },
        expectedOutput: {
          components: [
            {
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/another/nginx:latest', password: undefined, server: undefined, username: undefined } },
              env: undefined,
              max_cpu: '0.5',
              max_memory: '1Gi',
              name: 'test',
              probe: undefined,
            },
          ],
          max_scale: 10,
          min_scale: 0,
          name: 'test',
          port: 80,
          timeout_seconds: 30,
        },
      },
      {
        name: 'Success parsing image without path (only registry)',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test',
          image: 'nginx.sakuracr.jp',
          inherit_env: 'false',
          packet_filter_enabled: 'false',
        },
        expectedOutput: {
          components: [
            {
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp', password: undefined, server: undefined, username: undefined } },
              env: undefined,
              max_cpu: '0.5',
              max_memory: '1Gi',
              name: 'test',
              probe: undefined,
            },
          ],
          max_scale: 10,
          min_scale: 0,
          name: 'test',
          port: 80,
          timeout_seconds: 30,
        },
      },
      {
        name: 'Success set server option (has authentication)',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          container_registry_username: 'test',
          container_registry_password: 'test',
          inherit_env: 'false',
          packet_filter_enabled: 'false',
        },
        expectedOutput: {
          components: [
            {
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', server: 'nginx.sakuracr.jp', username: 'test', password: 'test' } },
              env: undefined,
              max_cpu: '0.5',
              max_memory: '1Gi',
              name: 'test',
              probe: undefined,
            },
          ],
          max_scale: 10,
          min_scale: 0,
          name: 'test',
          port: 80,
          timeout_seconds: 30,
        },
      },
      {
        name: 'Success set server option (undefined)',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          server: 'container.example.com',
          inherit_env: 'false',
          packet_filter_enabled: 'false',
        },
        expectedOutput: {
          components: [
            {
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', password: undefined, server: undefined, username: undefined } },
              env: undefined,
              max_cpu: '0.5',
              max_memory: '1Gi',
              name: 'test',
              probe: undefined,
            },
          ],
          max_scale: 10,
          min_scale: 0,
          name: 'test',
          port: 80,
          timeout_seconds: 30,
        },
      },
      {
        name: 'Success with multi-line env value',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: '1',
          max_memory: '1Gi',
          inherit_env: 'false',
          packet_filter_enabled: 'false',
          env: `NODE_ENV: "production"
LOG_LEVEL: "info"
ANOTHER_MAP: | 
    DEBUG: "ture"`,
        },
        expectedOutput: {
          components: [
            {
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', password: undefined, server: undefined, username: undefined } },
              env: [
                {
                  key: 'NODE_ENV',
                  value: 'production',
                },
                {
                  key: 'LOG_LEVEL',
                  value: 'info',
                },
                {
                  key: 'ANOTHER_MAP',
                  value: 'DEBUG: "ture"\n',
                },
              ],
              max_cpu: '1',
              max_memory: '1Gi',
              name: 'test',
              probe: undefined,
            },
          ],
          max_scale: 10,
          min_scale: 0,
          name: 'test',
          port: 80,
          timeout_seconds: 30,
        },
      },
      {
        name: 'Missing access_token',
        input: {
          access_secret: 'access_secret',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/another/nginx:latest',
        },
        expectedError: 'Input required and not supplied: access_token',
        expectedOutput: undefined,
      },
      {
        name: 'Missing access_secret',
        input: {
          access_token: 'access_token',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/another/nginx:latest',
        },
        expectedError: 'Input required and not supplied: access_secret',
        expectedOutput: undefined,
      },
      {
        name: 'Missing application_name',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          image: 'nginx.sakuracr.jp/another/nginx:latest',
        },
        expectedError: 'Input required and not supplied: application_name',
        expectedOutput: undefined,
      },
      {
        name: 'Missing image',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test',
        },
        expectedError: 'Input required and not supplied: image',
        expectedOutput: undefined,
      },
      {
        name: 'Only the username is missing in container registry authentication info',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          container_registry_password: 'password',
        },
        expectedError: 'Authentication to Container Registry requires Username and Password',
        expectedOutput: undefined,
      },
      {
        name: 'Only the password is missing in container registry authentication info',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          container_registry_username: 'username',
        },
        expectedError: 'Authentication to Container Registry requires Username and Password',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid timeout_seconds (NaN)',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test',
          timeout_seconds: 'aaa',
        },
        expectedError: 'timeout_seconds is not a valid number: NaN',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid port (NaN)',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          port: 'aaa',
        },
        expectedError: 'port is not a valid number: NaN',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid min_scale (NaN)',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          min_scale: 'aaa',
        },
        expectedError: 'min_scale is not a valid number: NaN',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid max_scale (NaN)',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_scale: 'aaa',
        },
        expectedError: 'max_scale is not a valid number: NaN',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid max_scale (NaN)',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_scale: 'aaa',
        },
        expectedError: 'max_scale is not a valid number: NaN',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid max_cpu (NaN)',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: 'aaa',
          max_memory: '1Gi',
        },
        expectedError: 'Invalid maxCPU and maxMemory value',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid max_memory (NaN)',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: '1',
          max_memory: 'a',
        },
        expectedError: 'Invalid maxCPU and maxMemory value',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid max_cpu and max_memory (out of plan)',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: '1',
          max_memory: '4Gi',
        },
        expectedError: 'Invalid maxCPU and maxMemory value',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid env',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: '1',
          max_memory: '1Gi',
          env: `NODE_ENV: "production
LOG_LEVEL: "info"`,
        },
        expectedError: `can not read a block mapping entry; a multiline key may not be an implicit key`,
        expectedOutput: undefined,
      },
      {
        name: 'env bad indentation of a mapping entry',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: '1',
          max_memory: '1Gi',
          env: `production: "aaaa"
 LOG_LEVEL: "info"
ANOTHER_MAP: | 
  DEBUG: "ture"`,
        },
        expectedError: `bad indentation of a mapping entry`,
        expectedOutput: undefined,
      },
      {
        name: 'Invalid inherit_env',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: '1',
          max_memory: '1Gi',
          env: `production: "aaaa"
LOG_LEVEL: "info"`,
          inherit_env: 'aaa',
        },
        expectedError: `Input does not meet YAML 1.2 "Core Schema" specification: packet_filter_enabled
Support boolean input list: \`true | True | TRUE | false | False | FALSE\``,
        expectedOutput: undefined,
      },
      {
        name: 'Invalid probe_port (NaN)',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          port: '80',
          probe_path: '/',
          probe_port: 'aaa',
        },
        expectedError: 'probe_port is not a valid number: NaN',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid probe_headers',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: '1',
          max_memory: '1Gi',
          probe_headers: `NODE_ENV: "production
LOG_LEVEL: "info"`,
        },
        expectedError: `can not read a block mapping entry; a multiline key may not be an implicit key`,
        expectedOutput: undefined,
      },
      {
        name: 'probe_headers bad indentation of a mapping entry',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: '1',
          max_memory: '1Gi',
          probe_headers: `NODE_ENV: "production"
 LOG_LEVEL: "info"
ANOTHER_MAP: |
  DEBUG: "ture`,
        },
        expectedError: `bad indentation of a mapping entry`,
        expectedOutput: undefined,
      },
      {
        name: 'Invalid packet_filter_enabled',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/nginx:latest',
          packet_filter_enabled: 'aaa',
        },
        expectedError: `Input does not meet YAML 1.2 "Core Schema" specification: packet_filter_enabled
Support boolean input list: \`true | True | TRUE | false | False | FALSE\``,
        expectedOutput: undefined,
      },
    ];
    test.each(testCase)('$name', async ({ input, expectedOutput, expectedOutputPacketFilter, expectedError }) => {
      // getInput.mockImplementation((key, options) => {
      //   return getFakeInput(input, key, options);
      // });
      //
      // getBooleanInputMock.mockImplementation((key, options) => {
      //   return getFakeBooleanInput(input, key, options);
      // });
      setEnvProxyActions(input);

      await run();
      if (expectedError) {
        expect(setFailed).toHaveBeenCalledWith(expect.stringContaining(expectedError));
      } else {
        const falseValue = ['false', 'False', 'FALSE'];
        if (!falseValue.includes(input.inherit_env ?? '')) {
          expect(getApplication).not.toHaveBeenCalled();
        }
        if (expectedOutputPacketFilter) {
          expect(patchPacketFilter).toHaveBeenCalledWith(undefined, expect.anything(), expectedOutputPacketFilter);
        }
        expect(createApplication).toHaveBeenCalledWith(undefined, expectedOutput);
      }
    });
  });

  describe('UpdateApplication', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });
    const testCase: TestCase[] = [
      {
        name: 'Success with minimum required inputs',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          inherit_env: 'false',
          packet_filter_enabled: 'false',
        },
        expectedOutput: {
          id: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc',
          components: [
            {
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', password: undefined, server: undefined, username: undefined } },
              env: [],
              secret: [
                {
                  key: 'DB_PASSWORD',
                  value: '',
                },
              ],
              max_cpu: '0.5',
              max_memory: '1Gi',
              name: 'test-application',
              probe: undefined,
            },
          ],
          max_scale: undefined,
          min_scale: undefined,
          name: 'test-application',
          port: undefined,
          timeout_seconds: undefined,
        },
      },
      {
        name: 'Success with full options',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          timeout_seconds: '500',
          port: '80',
          min_scale: '1',
          max_scale: '2',
          image: 'nginx.sakuracr.jp/nginx:latest',
          server: 'container.qpid.com',
          container_registry_username: 'username',
          container_registry_password: 'password',
          container_registry_action: 'new',
          components_name: 'componentName',
          max_cpu: '1',
          max_memory: '1Gi',
          env: `NODE_ENV: "production"
LOG_LEVEL: "info"`,
          inherit_env: 'false',
          probe_path: '/',
          probe_port: '80',
          probe_headers: `NODE_ENV: "production"
LOG_LEVEL: "info"`,
          packet_filter_enabled: 'true',
          packet_filter_allowlist: `0.0.0.0/0
1.1.1.1/32`,
        },
        expectedOutput: {
          id: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc',
          components: [
            {
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', password: 'password', server: 'container.qpid.com', username: 'username', action: 'new' } },
              env: [
                {
                  key: 'NODE_ENV',
                  value: 'production',
                },
                {
                  key: 'LOG_LEVEL',
                  value: 'info',
                },
              ],
              secret: [
                {
                  key: 'DB_PASSWORD',
                  value: '',
                },
              ],
              max_cpu: '1',
              max_memory: '1Gi',
              name: 'componentName',
              probe: {
                http_get: {
                  path: '/',
                  port: 80,
                  headers: [
                    { name: 'NODE_ENV', value: 'production' },
                    { name: 'LOG_LEVEL', value: 'info' },
                  ],
                },
              },
            },
          ],
          max_scale: 2,
          min_scale: 1,
          name: 'test-application',
          port: 80,
          timeout_seconds: 500,
        },
        expectedOutputPacketFilter: {
          is_enabled: true,
          settings: [
            {
              from_ip: '0.0.0.0',
              from_ip_prefix_length: 0,
            },
            {
              from_ip: '1.1.1.1',
              from_ip_prefix_length: 32,
            },
          ],
        },
      },
      {
        name: 'Success with full options with action keep',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          timeout_seconds: '500',
          port: '80',
          min_scale: '1',
          max_scale: '2',
          image: 'nginx.sakuracr.jp/nginx:latest',
          container_registry_action: 'keep',
          components_name: 'componentName',
          max_cpu: '1',
          max_memory: '1Gi',
          env: `NODE_ENV: "production"
LOG_LEVEL: "info"`,
          inherit_env: 'false',
          probe_path: '/',
          probe_port: '80',
          probe_headers: `NODE_ENV: "production"
LOG_LEVEL: "info"`,
          packet_filter_enabled: 'true',
          packet_filter_allowlist: `0.0.0.0/0
1.1.1.1/32`,
        },
        expectedOutput: {
          id: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc',
          components: [
            {
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', action: 'keep' } },
              env: [
                {
                  key: 'NODE_ENV',
                  value: 'production',
                },
                {
                  key: 'LOG_LEVEL',
                  value: 'info',
                },
              ],
              secret: [
                {
                  key: 'DB_PASSWORD',
                  value: '',
                },
              ],
              max_cpu: '1',
              max_memory: '1Gi',
              name: 'componentName',
              probe: {
                http_get: {
                  path: '/',
                  port: 80,
                  headers: [
                    { name: 'NODE_ENV', value: 'production' },
                    { name: 'LOG_LEVEL', value: 'info' },
                  ],
                },
              },
            },
          ],
          max_scale: 2,
          min_scale: 1,
          name: 'test-application',
          port: 80,
          timeout_seconds: 500,
        },
        expectedOutputPacketFilter: {
          is_enabled: true,
          settings: [
            {
              from_ip: '0.0.0.0',
              from_ip_prefix_length: 0,
            },
            {
              from_ip: '1.1.1.1',
              from_ip_prefix_length: 32,
            },
          ],
        },
      },

      {
        name: 'Success with full options inherit_env',
        id: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          timeout_seconds: '500',
          port: '80',
          min_scale: '1',
          max_scale: '2',
          image: 'nginx.sakuracr.jp/nginx:latest',
          server: 'container.qpid.com',
          container_registry_username: 'username',
          container_registry_password: 'password',
          components_name: 'componentName',
          max_cpu: '1',
          max_memory: '1Gi',
          env: `NODE_ENV: "production"
LOG_LEVEL: "info"`,
          inherit_env: 'true',
          probe_path: '/',
          probe_port: '80',
          probe_headers: `NODE_ENV: "production"
LOG_LEVEL: "info"`,
          packet_filter_enabled: 'true',
          packet_filter_allowlist: `0.0.0.0/0
1.1.1.1/32`,
        },
        expectedOutput: {
          id: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc',
          components: [
            {
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', password: 'password', server: 'container.qpid.com', username: 'username' } },
              env: [
                {
                  key: 'NODE_ENV',
                  value: 'dev',
                },
              ],
              secret: [
                {
                  key: 'DB_PASSWORD',
                  value: '',
                },
              ],
              max_cpu: '1',
              max_memory: '1Gi',
              name: 'componentName',
              probe: {
                http_get: {
                  path: '/',
                  port: 80,
                  headers: [
                    { name: 'NODE_ENV', value: 'production' },
                    { name: 'LOG_LEVEL', value: 'info' },
                  ],
                },
              },
            },
          ],
          max_scale: 2,
          min_scale: 1,
          name: 'test-application',
          port: 80,
          timeout_seconds: 500,
        },
        expectedOutputPacketFilter: {
          is_enabled: true,
          settings: [
            {
              from_ip: '0.0.0.0',
              from_ip_prefix_length: 0,
            },
            {
              from_ip: '1.1.1.1',
              from_ip_prefix_length: 32,
            },
          ],
        },
      },
      {
        name: 'Success parsing hierarchical image path',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/another/nginx:latest',
          inherit_env: 'false',
          packet_filter_enabled: 'false',
        },
        expectedOutput: {
          id: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc',
          components: [
            {
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/another/nginx:latest', password: undefined, server: undefined, username: undefined } },
              env: [],
              secret: [
                {
                  key: 'DB_PASSWORD',
                  value: '',
                },
              ],
              max_cpu: '0.5',
              max_memory: '1Gi',
              name: 'test-application',
              probe: undefined,
            },
          ],
          max_scale: undefined,
          min_scale: undefined,
          name: 'test-application',
          port: undefined,
          timeout_seconds: undefined,
        },
      },
      {
        name: 'Success parsing image without path (only registry)',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp',
          inherit_env: 'false',
          packet_filter_enabled: 'false',
        },
        expectedOutput: {
          id: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc',
          components: [
            {
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp', password: undefined, server: undefined, username: undefined } },
              env: [],
              secret: [
                {
                  key: 'DB_PASSWORD',
                  value: '',
                },
              ],
              max_cpu: '0.5',
              max_memory: '1Gi',
              name: 'test-application',
              probe: undefined,
            },
          ],
          max_scale: undefined,
          min_scale: undefined,
          name: 'test-application',
          port: undefined,
          timeout_seconds: undefined,
        },
      },
      {
        name: 'Success set server option (has authentication)',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          container_registry_username: 'username',
          container_registry_password: 'password',
          inherit_env: 'false',
          packet_filter_enabled: 'false',
        },
        expectedOutput: {
          id: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc',
          components: [
            {
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', server: 'nginx.sakuracr.jp', username: 'username', password: 'password' } },
              env: [],
              secret: [
                {
                  key: 'DB_PASSWORD',
                  value: '',
                },
              ],
              max_cpu: '0.5',
              max_memory: '1Gi',
              name: 'test-application',
              probe: undefined,
            },
          ],
          max_scale: undefined,
          min_scale: undefined,
          name: 'test-application',
          port: undefined,
          timeout_seconds: undefined,
        },
      },
      {
        name: 'Success set server option (Undefined)',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          server: 'container.example.com',
          inherit_env: 'false',
          packet_filter_enabled: 'false',
        },
        expectedOutput: {
          id: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc',
          components: [
            {
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', password: undefined, server: undefined, username: undefined } },
              env: [],
              secret: [
                {
                  key: 'DB_PASSWORD',
                  value: '',
                },
              ],
              max_cpu: '0.5',
              max_memory: '1Gi',
              name: 'test-application',
              probe: undefined,
            },
          ],
          max_scale: undefined,
          min_scale: undefined,
          name: 'test-application',
          port: undefined,
          timeout_seconds: undefined,
        },
      },
      {
        name: 'Success with multi-line env value',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: '1',
          max_memory: '1Gi',
          inherit_env: 'false',
          packet_filter_enabled: 'false',
          env: `NODE_ENV: "production"
LOG_LEVEL: "info"
ANOTHER_MAP: | 
    DEBUG: "ture"`,
        },
        expectedOutput: {
          id: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc',
          components: [
            {
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', password: undefined, server: undefined, username: undefined } },
              env: [
                {
                  key: 'NODE_ENV',
                  value: 'production',
                },
                {
                  key: 'LOG_LEVEL',
                  value: 'info',
                },
                {
                  key: 'ANOTHER_MAP',
                  value: 'DEBUG: "ture"\n',
                },
              ],
              secret: [
                {
                  key: 'DB_PASSWORD',
                  value: '',
                },
              ],
              max_cpu: '1',
              max_memory: '1Gi',
              name: 'test-application',
              probe: undefined,
            },
          ],
          max_scale: undefined,
          min_scale: undefined,
          name: 'test-application',
          port: undefined,
          timeout_seconds: undefined,
        },
      },
      {
        name: 'Missing access_token',
        input: {
          access_secret: 'access_secret',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/another/nginx:latest',
        },
        expectedError: 'Input required and not supplied: access_token',
        expectedOutput: undefined,
      },
      {
        name: 'Missing access_secret',
        input: {
          access_token: 'access_token',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/another/nginx:latest',
        },
        expectedError: 'Input required and not supplied: access_secret',
        expectedOutput: undefined,
      },
      {
        name: 'Missing application_name',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          image: 'nginx.sakuracr.jp/another/nginx:latest',
        },
        expectedError: 'Input required and not supplied: application_name',
        expectedOutput: undefined,
      },
      {
        name: 'Missing image',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test-application',
        },
        expectedError: 'Input required and not supplied: image',
        expectedOutput: undefined,
      },
      {
        name: 'Only the username is missing in container registry authentication info',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          container_registry_password: 'password',
        },
        expectedError: 'Authentication to Container Registry requires Username and Password',
        expectedOutput: undefined,
      },
      {
        name: 'Only the password is missing in container registry authentication info',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          container_registry_username: 'username',
        },
        expectedError: 'Authentication to Container Registry requires Username and Password',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid action value',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          container_registry_username: 'username',
          container_registry_password: 'password',
          container_registry_action: 'a',
        },
        expectedError: 'Invalid action value',
        expectedOutput: undefined,
      },
      {
        name: 'do not input username and password action is keep',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          container_registry_username: 'username',
          container_registry_password: 'password',
          container_registry_action: 'keep',
        },
        expectedError: 'Invalid Server, Username or Password must not be specified when Action is set to keep',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid timeout_seconds (NaN)',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test-application',
          timeout_seconds: 'aaa',
        },
        expectedError: 'timeout_seconds is not a valid number: NaN',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid port (NaN)',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          port: 'aaa',
        },
        expectedError: 'port is not a valid number: NaN',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid min_scale (NaN)',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          min_scale: 'aaa',
        },
        expectedError: 'min_scale is not a valid number: NaN',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid max_scale (NaN)',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_scale: 'aaa',
        },
        expectedError: 'max_scale is not a valid number: NaN',
      },
      {
        name: 'Invalid max_scale (NaN)',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_scale: 'aaa',
        },
        expectedError: 'max_scale is not a valid number: NaN',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid max_cpu (NaN)',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: 'aaa',
          max_memory: '1Gi',
        },
        expectedError: 'Invalid maxCPU and maxMemory value',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid max_memory (NaN)',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: '1',
          max_memory: 'a',
        },
        expectedError: 'Invalid maxCPU and maxMemory value',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid max_cpu and max_memory (out of plan)',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: '1',
          max_memory: '4Gi',
        },
        expectedError: 'Invalid maxCPU and maxMemory value',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid env',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: '1',
          max_memory: '1Gi',
          inherit_env: 'false',
          env: `NODE_ENV: "production
LOG_LEVEL: "info"`,
        },
        expectedError: `can not read a block mapping entry; a multiline key may not be an implicit key`,
        expectedOutput: undefined,
      },
      {
        name: 'env bad indentation of a mapping entry',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: '1',
          max_memory: '1Gi',
          inherit_env: 'false',
          env: `production: "aaaa"
 LOG_LEVEL: "info"
ANOTHER_MAP: | 
  DEBUG: "ture"`,
        },
        expectedError: `bad indentation of a mapping entry`,
        expectedOutput: undefined,
      },
      {
        name: 'Invalid inherit_env',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: '1',
          max_memory: '1Gi',
          env: `production: "aaaa"
LOG_LEVEL: "info"`,
          inherit_env: 'aaa',
        },
        expectedError: `Input does not meet YAML 1.2 "Core Schema" specification: inherit_env
Support boolean input list: \`true | True | TRUE | false | False | FALSE\``,
        expectedOutput: undefined,
      },
      {
        name: 'Invalid probe_port (NaN)',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          port: '80',
          probe_path: '/',
          probe_port: 'aaa',
          inherit_env: 'false',
        },
        expectedError: 'probe_port is not a valid number: NaN',
        expectedOutput: undefined,
      },
      {
        name: 'Invalid probe_headers',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: '1',
          max_memory: '1Gi',
          inherit_env: 'false',
          probe_headers: `NODE_ENV: "production
LOG_LEVEL: "info"`,
        },
        expectedError: `can not read a block mapping entry; a multiline key may not be an implicit key`,
        expectedOutput: undefined,
      },
      {
        name: 'probe_headers bad indentation of a mapping entry',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          max_cpu: '1',
          max_memory: '1Gi',
          inherit_env: 'false',
          probe_headers: `NODE_ENV: "production"
 LOG_LEVEL: "info"
ANOTHER_MAP: |
  DEBUG: "ture`,
        },
        expectedError: `bad indentation of a mapping entry`,
        expectedOutput: undefined,
      },
      {
        name: 'Invalid packet_filter_enabled',
        input: {
          access_token: 'aaa',
          access_secret: 'bbb',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/nginx:latest',
          inherit_env: 'false',
          packet_filter_enabled: 'aaa',
        },
        expectedError: `Input does not meet YAML 1.2 "Core Schema" specification: packet_filter_enabled
Support boolean input list: \`true | True | TRUE | false | False | FALSE\``,
        expectedOutput: undefined,
      },
    ];
    test.each(testCase)('$name', async ({ input, expectedOutput, expectedOutputPacketFilter, expectedError }) => {
      setEnvProxyActions(input);
      await run();
      if (expectedError) {
        expect(setFailed).toHaveBeenCalledWith(expect.stringContaining(expectedError));
      } else {
        const falseValue = ['false', 'False', 'FALSE'];
        if (!falseValue.includes(input.inherit_env ?? '')) {
          expect(getApplication).toHaveBeenCalled();
        }
        if (expectedOutputPacketFilter) {
          expect(patchPacketFilter).toHaveBeenCalledWith(undefined, expect.anything(), expectedOutputPacketFilter);
        }
        expect(patchApplication).toHaveBeenCalledWith(undefined, expectedOutput);
      }
    });
  });
});
