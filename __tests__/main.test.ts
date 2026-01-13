import { run } from '../src/main';
import { getBooleanInput, getInput, setFailed } from '@actions/core';
import { getFakeBooleanInput, getFakeInput } from '../testutils/testutils';
import { patchPacketFilter, createApplication, getApplication, patchApplication } from '../src/apprun-client';
import { jest } from '@jest/globals';
import * as model from '../src/model';
import { Buffer } from 'node:buffer';

jest.mock('@actions/core');

jest.mock('../src/apprun-client', () => {
  const originalModule = jest.requireActual<Record<string, unknown>>('../src/apprun-client');
  return {
    ...originalModule,
    getAllApplication: jest.fn((): Promise<model.GetAllApplicationResponse> => {
      const mockData: model.GetAllApplicationResponse = {
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
      return Promise.resolve(mockData);
    }),
    getApplication: jest.fn((): Promise<model.GetApplicationResponse> => {
      const mockData: model.GetApplicationResponse = {
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
                password: 'aaa',
              },
            },
            env: [
              {
                key: 'NODE_ENV',
                value: 'dev',
              },
            ],
          },
        ],
        status: 'Healthy',
        resource_id: '100000000000',
        update_at: '2019-08-24T14:15:22Z',
        public_url: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc.apprun.sakura.ne.jp',
      };
      return Promise.resolve(mockData);
    }),
    createApplication: jest.fn((): Promise<model.CreateApplicationResponse> => {
      const mockData: model.CreateApplicationResponse = {
        id: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc',
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
                password: 'aaa',
              },
            },
            env: [
              {
                key: 'NODE_ENV',
                value: 'dev',
              },
            ],
          },
        ],
        status: 'Healthy',
        resource_id: '100000000000',
        created_at: '2019-08-24T14:15:22Z',
        public_url: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc.apprun.sakura.ne.jp',
      };
      return Promise.resolve(mockData);
    }),
    patchApplication: jest.fn((): Promise<model.PatchApplicationResponse> => {
      const mockData: model.PatchApplicationResponse = {
        id: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc',
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
                password: 'aaa',
              },
            },
            env: [
              {
                key: 'NODE_ENV',
                value: 'dev',
              },
            ],
          },
        ],
        status: 'Healthy',
        resource_id: '100000000000',
        update_at: '2019-08-24T14:15:22Z',
        public_url: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc.apprun.sakura.ne.jp',
      };
      return Promise.resolve(mockData);
    }),
    patchPacketFilter: jest.fn(),
  };
});

describe('main.ts', () => {
  const getInputMock = jest.mocked(getInput);
  const getBooleanInputMock = jest.mocked(getBooleanInput);
  const setFailedMock = jest.mocked(setFailed);
  const createApplicationMock = jest.mocked(createApplication);
  const patchApplicationMock = jest.mocked(patchApplication);
  const getApplicationMock = jest.mocked(getApplication);

  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('CreateApplication', () => {
    const testCase = [
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
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', password: undefined, server: 'nginx.sakuracr.jp', username: undefined } },
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
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/another/nginx:latest', password: undefined, server: 'nginx.sakuracr.jp', username: undefined } },
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
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp', password: undefined, server: 'nginx.sakuracr.jp', username: undefined } },
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
        name: 'Success set server option',
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
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', password: undefined, server: 'container.example.com', username: undefined } },
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
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', password: undefined, server: 'nginx.sakuracr.jp', username: undefined } },
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
        expectedError: 'access_token is required',
      },
      {
        name: 'Missing access_secret',
        input: {
          access_token: 'access_token',
          application_name: 'test',
          image: 'nginx.sakuracr.jp/another/nginx:latest',
        },
        expectedError: 'access_secret is required',
      },
      {
        name: 'Missing application_name',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          image: 'nginx.sakuracr.jp/another/nginx:latest',
        },
        expectedError: 'application_name is required',
      },
      {
        name: 'Missing image',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test',
        },
        expectedError: 'image is required',
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
      },
    ];
    test.each(testCase)('$name', async ({ input, expectedOutput, expectedOutputPacketFilter, expectedError }) => {
      getInputMock.mockImplementation((key, options) => {
        return getFakeInput(input, key, options);
      });

      getBooleanInputMock.mockImplementation((key, options) => {
        return getFakeBooleanInput(input, key, options);
      });

      await run();
      if (expectedError) {
        expect(setFailedMock).toHaveBeenCalledWith(expect.stringContaining(expectedError));
      } else {
        const authHeader = Buffer.from(`${input.access_token ?? ''}:${input.access_secret ?? ''}`).toString('base64');
        const falseValue = ['false', 'False', 'FALSE'];
        if (!falseValue.includes(input.inherit_env ?? '')) {
          expect(getApplicationMock).not.toHaveBeenCalled();
        }
        if (expectedOutputPacketFilter) {
          expect(patchPacketFilter).toHaveBeenCalledWith(expect.anything(), expect.anything(), expectedOutputPacketFilter);
        }
        expect(createApplicationMock).toHaveBeenCalledWith({ authHeader: `Basic ${authHeader}` }, expectedOutput);
      }
    });
  });

  describe('UpdateApplication', () => {
    const testCase = [
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
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', password: undefined, server: 'nginx.sakuracr.jp', username: undefined } },
              env: [],
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
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/another/nginx:latest', password: undefined, server: 'nginx.sakuracr.jp', username: undefined } },
              env: [],
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
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp', password: undefined, server: 'nginx.sakuracr.jp', username: undefined } },
              env: [],
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
        name: 'Success set server option',
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
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', password: undefined, server: 'container.example.com', username: undefined } },
              env: [],
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
              deploy_source: { container_registry: { image: 'nginx.sakuracr.jp/nginx:latest', password: undefined, server: 'nginx.sakuracr.jp', username: undefined } },
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
        expectedError: 'access_token is required',
      },
      {
        name: 'Missing access_secret',
        input: {
          access_token: 'access_token',
          application_name: 'test-application',
          image: 'nginx.sakuracr.jp/another/nginx:latest',
        },
        expectedError: 'access_secret is required',
      },
      {
        name: 'Missing application_name',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          image: 'nginx.sakuracr.jp/another/nginx:latest',
        },
        expectedError: 'application_name is required',
      },
      {
        name: 'Missing image',
        input: {
          access_token: 'access_token',
          access_secret: 'access_secret',
          application_name: 'test-application',
        },
        expectedError: 'image is required',
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
      },
    ];
    test.each(testCase)('$name', async ({ input, expectedOutput, expectedOutputPacketFilter, expectedError }) => {
      getInputMock.mockImplementation((key, options) => {
        return getFakeInput(input, key, options);
      });

      getBooleanInputMock.mockImplementation((key, options) => {
        return getFakeBooleanInput(input, key, options);
      });

      await run();
      if (expectedError) {
        expect(setFailedMock).toHaveBeenCalledWith(expect.stringContaining(expectedError));
      } else {
        const authHeader = Buffer.from(`${input.access_token ?? ''}:${input.access_secret ?? ''}`).toString('base64');
        const falseValue = ['false', 'False', 'FALSE'];
        if (!falseValue.includes(input.inherit_env ?? '')) {
          expect(getApplicationMock).toHaveBeenCalled();
        }
        if (expectedOutputPacketFilter) {
          expect(patchPacketFilter).toHaveBeenCalledWith(expect.anything(), expect.anything(), expectedOutputPacketFilter);
        }
        expect(patchApplicationMock).toHaveBeenCalledWith({ authHeader: `Basic ${authHeader}` }, expectedOutput);
      }
    });
  });
});
