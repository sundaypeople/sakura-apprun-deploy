import { jest, expect, test, describe, afterEach, beforeEach } from '@jest/globals';
import { mockCore } from './core';
import * as model from '../src/model';

jest.unstable_mockModule('@actions/core', () => mockCore);
jest.unstable_mockModule('../src/apprun-client', async () => {
  const mocks = await import('../mocks/apprun-client');
  return {
    ApprunClient: mocks.MockApprunClient,
  };
});

const { run } = await import('../src/main');
const { mockCreateApplication, mockPatchApplication } = await import('../mocks/apprun-client');

describe('Behavior with mocked ApprunClient', () => {
  const originalEnv = { ...process.env };

  // ✅ 成功系が落ちないように、未指定時に空文字になりがちな inputs はデフォルトを入れておく
  const baseEnv = {
    ...originalEnv,
    INPUT_PACKET_FILTER_ENABLED: 'true',
  };

  const setEnv = (overrides: Record<string, string | undefined>) => {
    process.env = {
      ...baseEnv,
      ...overrides,
    } as NodeJS.ProcessEnv;
  };

  beforeEach(() => {
    // テスト開始時点でベース env に戻す
    process.env = { ...baseEnv };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  test('creates application when name does not exist', async () => {
    setEnv({
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'new-app',
      INPUT_PORT: '8080',
      INPUT_IMAGE: 'registry.example.com/ns/app:latest',
      INPUT_MIN_SCALE: '1',
    });

    await run();

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(mockCreateApplication).toHaveBeenCalledTimes(1);
    expect(mockCore.setOutput).toHaveBeenCalledWith('public_url', expect.stringContaining('.apprun.sakura.ne.jp'));
  });

  test('patches application when name already exists', async () => {
    setEnv({
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'test-application',
      INPUT_IMAGE: 'registry.example.com/ns/app:latest',
    });

    await run();

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(mockPatchApplication).toHaveBeenCalledTimes(2);
    expect(mockCreateApplication).not.toHaveBeenCalled();

    const patchArg = mockPatchApplication.mock.calls[0][0] as model.PatchApplicationRequest;
    expect(patchArg.id).toBe('0e63e868-ee29-4cd2-bbd1-79f3c10d19cc');
  });

  test('maps ENV yaml to key/value array (create path)', async () => {
    setEnv({
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'my-app',
      INPUT_PORT: '8080',
      INPUT_IMAGE: 'registry.example.com/my-image:latest',
      INPUT_MIN_SCALE: '1',
      INPUT_ENV: 'aaaa: "aaaa"\nvvv: "vvv"',
    });

    await run();

    expect(mockCore.setFailed).not.toHaveBeenCalled();
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
    setEnv({
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'probe-app',
      INPUT_PORT: '8080',
      INPUT_IMAGE: 'registry.example.com/app:tag',
      INPUT_MIN_SCALE: '1',
      INPUT_PROBE_PATH: '/healthz',
      INPUT_PROBE_PORT: '8080',
      INPUT_PROBE_HEADERS: 'X-Token: "abc"\nX-Env: "dev"',
    });

    await run();

    expect(mockCore.setFailed).not.toHaveBeenCalled();
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
    setEnv({
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'path-only',
      INPUT_PORT: '8080',
      INPUT_IMAGE: 'registry.example.com/app:tag',
      INPUT_MIN_SCALE: '1',
      INPUT_PROBE_PATH: '/live',
      // INPUT_PROBE_PORT is missing
    });

    await run();

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    {
      const arg = mockCreateApplication.mock.calls[0][0] as model.CreateApplicationRequest;
      expect(arg.components[0].probe).toBeUndefined();
    }

    // ✅ 2回目の run() を別ケースとして扱う（calls[0] がズレないように）
    jest.clearAllMocks();

    // port のみ
    setEnv({
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'port-only',
      INPUT_PORT: '8080',
      INPUT_IMAGE: 'registry.example.com/app:tag',
      INPUT_MIN_SCALE: '1',
      INPUT_PROBE_PORT: '8080',
      // INPUT_PROBE_PATH is missing
    });

    await run();

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    {
      const arg = mockCreateApplication.mock.calls[0][0] as model.CreateApplicationRequest;
      expect(arg.components[0].probe).toBeUndefined();
    }
  });

  test('fails on invalid ENV yaml (create path)', async () => {
    setEnv({
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'yaml-fail',
      INPUT_PORT: '8080',
      INPUT_IMAGE: 'registry.example.com/app:tag',
      INPUT_ENV: 'aaaa: "aaaa"\nvvv:"vvv"',
    });

    await run();

    expect(mockCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('can not read a block mapping entry'));
    expect(mockCreateApplication).not.toHaveBeenCalled();
  });

  test('update path: fails on invalid time_seconds', async () => {
    setEnv({
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'test-application',
      INPUT_IMAGE: 'registry.example.com/app:tag',
      INPUT_TIME_SECONDS: 'aa',
    });

    await run();

    expect(mockCore.setFailed).toHaveBeenCalledWith('time_seconds is not a valid number: NaN');
    expect(mockPatchApplication).not.toHaveBeenCalled();
  });

  test('update path: fails on invalid max_cpu', async () => {
    setEnv({
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'test-application',
      INPUT_IMAGE: 'registry.example.com/app:tag',
      INPUT_MAX_CPU: '2',
    });

    await run();

    expect(mockCore.setFailed).toHaveBeenCalledWith('Invalid maxCPU and maxMemory value');
    expect(mockPatchApplication).not.toHaveBeenCalled();
  });

  test('server defaults to registry host when not provided (create path)', async () => {
    setEnv({
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'server-default',
      INPUT_PORT: '8080',
      INPUT_IMAGE: 'registry.example.com/namespace/app:latest',
      INPUT_MIN_SCALE: '1',
      // no INPUT_SERVER
    });

    await run();

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    const arg = mockCreateApplication.mock.calls[0][0] as model.CreateApplicationRequest;
    expect(arg.components[0].deploy_source.container_registry.server).toBe('registry.example.com');
  });

  test('component name defaults to application_name (create path)', async () => {
    setEnv({
      INPUT_ACCESS_TOKEN: 'token',
      INPUT_ACCESS_SECRET: 'secret',
      INPUT_APPLICATION_NAME: 'my-app',
      INPUT_PORT: '8080',
      INPUT_IMAGE: 'registry.example.com/app:tag',
      INPUT_MIN_SCALE: '1',
      // no INPUT_COMPONENTS_NAME
    });

    await run();

    expect(mockCore.setFailed).not.toHaveBeenCalled();
    const arg = mockCreateApplication.mock.calls[0][0] as model.CreateApplicationRequest;
    expect(arg.components[0].name).toBe('my-app');
  });
});
