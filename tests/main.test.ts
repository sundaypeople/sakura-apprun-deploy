import { jest, expect, test, describe, afterEach } from '@jest/globals';
import { mockCore } from './core';
import * as model from '../src/model';

jest.unstable_mockModule('@actions/core', () => mockCore);
jest.unstable_mockModule('../src/apprun-client', async () => {
  const mocks = await import('../mocks/apprun-client');
  return {
    ApprunClient: mocks.MockApprunClient, // named export
  };
});

const { run } = await import('../src/main');
const { mockCreateApplication, mockPatchApplication } = await import('../mocks/apprun-client');

describe('Behavior with mocked ApprunClient', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  test('creates application when name does not exist', async () => {
    process.env = {
      ...originalEnv,
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'new-app', // __mocks__ は "test-application" を返すので未存在
      INPUT_PORT: '8080',
      INPUT_IMAGE: 'registry.example.com/ns/app:latest',
      INPUT_MIN_SCALE: '1',
    };

    await run();

    expect(mockCreateApplication).toHaveBeenCalledTimes(1);
    expect(mockPatchApplication).not.toHaveBeenCalled();

    // setOutput も呼ばれている
    expect(mockCore.setOutput).toHaveBeenCalledWith('public_url', expect.stringContaining('.apprun.sakura.ne.jp'));
  });

  test('patches application when name already exists', async () => {
    process.env = {
      ...originalEnv,
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'test-application', // __mocks__ に存在
      INPUT_IMAGE: 'registry.example.com/ns/app:latest', // update pathでも必須
    };

    await run();

    expect(mockPatchApplication).toHaveBeenCalledTimes(1);
    expect(mockCreateApplication).not.toHaveBeenCalled();

    // patch に渡った id を検証
    const patchArg = mockPatchApplication.mock.calls[0][0] as model.PatchApplicationRequest;
    expect(patchArg.id).toBe('0e63e868-ee29-4cd2-bbd1-79f3c10d19cc');
  });

  test('maps ENV yaml to key/value array (create path)', async () => {
    process.env = {
      ...originalEnv,
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'my-app',
      INPUT_PORT: '8080',
      INPUT_IMAGE: 'registry.example.com/my-image:latest',
      INPUT_MIN_SCALE: '1',
      INPUT_ENV: 'aaaa: "aaaa"\nvvv: "vvv"',
    };

    await run();

    const createArg = mockCreateApplication.mock.calls[0][0] as model.CreateApplicationRequest;
    expect(createArg.components[0].env).toEqual(
      expect.arrayContaining([
        { key: 'aaaa', value: 'aaaa' },
        { key: 'vvv', value: 'vvv' },
      ]),
    );
    expect((createArg.components[0].env ?? []).length).toBe(2);
  });

  test('assembles probe with path, port, and headers (create path)', async () => {
    process.env = {
      ...originalEnv,
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'probe-app',
      INPUT_PORT: '8080',
      INPUT_IMAGE: 'registry.example.com/app:tag',
      INPUT_MIN_SCALE: '1',
      INPUT_PROBE_PATH: '/healthz',
      INPUT_PROBE_PORT: '8080',
      INPUT_PROBE_HEADERS: 'X-Token: "abc"\nX-Env: "dev"',
    };

    await run();

    const arg = mockCreateApplication.mock.calls[0][0] as model.CreateApplicationRequest;
    const probe = arg.components[0].probe;

    expect(probe).toBeDefined();
    expect(probe?.http_get).toBeDefined();

    const http = probe!.http_get!;
    expect(http.path).toBe('/healthz');
    expect(http.port).toBe(8080);
    expect(http.headers).toEqual(
      expect.arrayContaining([
        { name: 'X-Token', value: 'abc' },
        { name: 'X-Env', value: 'dev' },
      ]),
    );
  });

  test('omits probe when only path or only port is provided', async () => {
    // path のみ
    process.env = {
      ...originalEnv,
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'path-only',
      INPUT_PORT: '8080',
      INPUT_IMAGE: 'registry.example.com/app:tag',
      INPUT_MIN_SCALE: '1',
      INPUT_PROBE_PATH: '/live',
      // INPUT_PROBE_PORT is missing
    };

    await run();

    let arg = mockCreateApplication.mock.calls[0][0] as model.CreateApplicationRequest;
    expect(arg.components[0].probe).toBeUndefined();

    process.env = {
      ...originalEnv,
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'port-only',
      INPUT_PORT: '8080',
      INPUT_IMAGE: 'registry.example.com/app:tag',
      INPUT_MIN_SCALE: '1',
      // INPUT_PROBE_PATH missing
      INPUT_PROBE_PORT: '8080',
    };

    await run();

    arg = mockCreateApplication.mock.calls[0][0] as model.CreateApplicationRequest;
    expect(arg.components[0].probe).toBeUndefined();
  });

  test('fails on invalid ENV yaml (create path)', async () => {
    process.env = {
      ...originalEnv,
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'yaml-fail',
      INPUT_PORT: '8080', // 数値は正しく通す
      INPUT_IMAGE: 'registry.example.com/app:tag',
      INPUT_ENV: 'aaaa: "aaaa"\nvvv:"vvv"', // コロン後のスペース欠如 → YAML パースエラー
    };

    await run();

    expect(mockCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('can not read a block mapping entry'));
    expect(mockCreateApplication).not.toHaveBeenCalled();
  });

  test('update path: fails on invalid time_seconds', async () => {
    process.env = {
      ...originalEnv,
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'test-application', // update path
      INPUT_IMAGE: 'registry.example.com/app:tag',
      INPUT_TIME_SECONDS: 'aa', // 無効
    };

    await run();

    expect(mockCore.setFailed).toHaveBeenCalledWith('time_seconds is not a valid number: NaN');
    expect(mockPatchApplication).not.toHaveBeenCalled();
  });

  test('update path: fails on invalid max_cpu', async () => {
    process.env = {
      ...originalEnv,
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'test-application', // update path
      INPUT_IMAGE: 'registry.example.com/app:tag',
      INPUT_MAX_CPU: '2', // 許容リスト外
    };

    await run();

    expect(mockCore.setFailed).toHaveBeenCalledWith('Invalid maxCPU and maxMemory value');
    expect(mockPatchApplication).not.toHaveBeenCalled();
  });

  test('server defaults to registry host when not provided (create path)', async () => {
    process.env = {
      ...originalEnv,
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'server-default',
      INPUT_PORT: '8080',
      INPUT_IMAGE: 'registry.example.com/namespace/app:latest',
      INPUT_MIN_SCALE: '1',
      // no INPUT_SERVER
    };

    await run();

    const arg = mockCreateApplication.mock.calls[0][0] as model.CreateApplicationRequest;
    expect(arg.components[0].deploy_source.container_registry.server).toBe('registry.example.com');
  });

  test('component name defaults to application_name (create path)', async () => {
    process.env = {
      ...originalEnv,
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'my-app',
      INPUT_PORT: '8080',
      INPUT_IMAGE: 'registry.example.com/app:tag',
      INPUT_MIN_SCALE: '1',
      // no INPUT_COMPONENTS_NAME（実装は componentsName を読みに行くので未指定＝default）
    };

    await run();

    const arg = mockCreateApplication.mock.calls[0][0] as model.CreateApplicationRequest;
    expect(arg.components[0].name).toBe('my-app');
  });
});
