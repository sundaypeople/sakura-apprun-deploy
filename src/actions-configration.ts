import { getInput } from '@actions/core';
import * as model from './model';
import * as yaml from 'js-yaml';

export function getConfig(nameToIdMap: Map<string, string>): model.CreateApplicationRequest | model.PatchApplicationRequest {
  const applicationName = getInput('application_name', {
    trimWhitespace: true,
  });
  const applicationID = nameToIdMap.get(applicationName);
  if (applicationID == undefined) {
    return getCreateConfig(applicationName);
  } else {
    return getUpdateConfig(applicationName, applicationID);
  }
}

function getNumberInputUndefined(keyword: string): number | undefined {
  const result = getInput(keyword, { required: false, trimWhitespace: true });
  if (result == '' || result == undefined) {
    return undefined;
  }
  const resultNumber = Number.parseInt(result);
  if (isNaN(resultNumber)) {
    throw new Error(`${keyword} is not a valid number: ${resultNumber}`);
  }
  return resultNumber;
}

function getNumberInput(keyword: string, defaultNumber: number, required: boolean): number {
  const result = getInput(keyword, {
    required: required,
    trimWhitespace: true,
  });
  if (result == '' || typeof result == 'undefined') {
    return defaultNumber;
  }
  const resultNumber = Number.parseInt(result);
  if (isNaN(resultNumber)) {
    throw new Error(`${keyword} is not a valid number: ${resultNumber}`);
  }
  return resultNumber;
}

function getStringInputUndefined(keyword: string, trimWhitespace: boolean): string | undefined {
  const result = getInput(keyword, {
    required: false,
    trimWhitespace: trimWhitespace,
  });
  if (result == '' || result == undefined) {
    return undefined;
  }
  return result;
}

function getStringInput(keyword: string, defaultString: string, required: boolean, trimWhitespace: boolean): string {
  const result = getInput(keyword, {
    required: required,
    trimWhitespace: trimWhitespace,
  });
  if (result == '' || result == undefined) {
    return defaultString;
  }
  return result;
}

export function getAPIKey(): model.Access {
  const accessToken = getStringInput('access_token', '', true, true);
  const accessSecret = getStringInput('access_secret', '', true, true);
  if (!accessToken || !accessSecret) {
    throw new Error('Both access-token and access-secret are required');
  }
  return { token: accessToken, secret: accessSecret };
}

export function getCreateConfig(applicationName: string): model.CreateApplicationRequest {
  const timeoutSeconds = getNumberInput('time_seconds', 30, false);
  const port = getNumberInput('port', 80, false);
  const minScale = getNumberInput('minScale', 0, false);
  const maxScale = getNumberInput('maxScale', 10, false);
  const image = getStringInput('image', '', true, true);
  const server = getStringInput('server', typeof image == 'undefined' ? '' : image?.split('/')[0], false, true);
  const username = getStringInputUndefined('container_registry_username', true);
  const password = getStringInputUndefined('container_registry_password', true);
  const componentsName = getStringInput('componentsName', applicationName, false, true);
  const maxCpu = getStringInput('maxCpu', '0.1', false, true);
  if (!['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '1'].includes(maxCpu)) {
    throw new Error(`Invalid maxCpu value ${maxCpu}`);
  }
  const maxMemory = getStringInput('maxMemory', '256Mi', false, true);
  if (!['256Mi', '512Mi', '1Gi', '2Gi'].includes(maxMemory)) {
    throw new Error(`Invalid maxMemory value`);
  }
  const envInput = getStringInputUndefined('env', false);
  const env: Array<model.Env> = [];
  if (typeof envInput !== 'undefined') {
    const envYaml = yaml.load(envInput) as Record<string, string>;
    if (!Array.isArray(envYaml) && typeof envYaml === 'object') {
      Object.keys(envYaml).forEach((k) => {
        env.push({ key: k, value: envYaml[k] });
      });
    }
  }

  const probePath = getStringInputUndefined('probe_path', true);
  const probePort = getNumberInputUndefined('probe_port');
  const probeHeadersInput = getStringInputUndefined('probe_headers', true);
  const headers: Array<model.Header> = [];
  if (typeof probeHeadersInput !== 'undefined') {
    const probeHeadersYaml = yaml.load(probeHeadersInput) as Record<string, string>;
    if (!Array.isArray(probeHeadersYaml) && typeof probeHeadersYaml === 'object') {
      Object.keys(probeHeadersYaml).forEach((k) => {
        headers.push({ name: k, value: probeHeadersYaml[k] });
      });
    }
  }
  let probe: model.Probe | undefined = undefined;
  if (typeof probePort !== 'undefined' && typeof probePath !== 'undefined') {
    probe = {
      http_get: {
        path: probePath,
        port: probePort,
        headers: headers.length > 0 ? headers : undefined,
      },
    };
  }

  const components: model.ComponentSpec[] = [
    {
      name: componentsName,
      max_cpu: maxCpu,
      max_memory: maxMemory,
      deploy_source: {
        container_registry: {
          image: image,
          server: server,
          username: username,
          password: password,
        },
      },
      env: env.length > 0 ? env : undefined,
      probe: probe,
    },
  ];

  const application: model.CreateApplicationRequest = {
    name: applicationName,
    timeout_seconds: timeoutSeconds,
    port: port,
    min_scale: minScale,
    max_scale: maxScale,
    components: components,
  };
  return application;
}

export function getUpdateConfig(applicationName: string, applicationID: string): model.PatchApplicationRequest {
  const timeoutSeconds = getNumberInputUndefined('time_seconds');
  const port = getNumberInputUndefined('port');
  const minScale = getNumberInputUndefined('min_scale');
  const maxScale = getNumberInputUndefined('max_scale');
  const image = getStringInput('image', '', true, true);
  const server = getStringInput('server', typeof image == 'undefined' ? '' : image?.split('/')[0], false, true);
  const username = getStringInputUndefined('container_registry_username', true);
  const password = getStringInputUndefined('container_registry_password', true);
  const componentsName = getStringInput('componentsName', applicationName, false, true);
  const maxCpu = getStringInput('max_cpu', '0.1', false, true);
  if (!['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '1'].includes(maxCpu)) {
    throw new Error(`Invalid maxCpu value`);
  }
  const maxMemory = getStringInput('max_memory', '256Mi', false, true);
  if (!['256Mi', '512Mi', '1Gi', '2Gi'].includes(maxMemory)) {
    throw new Error(`Invalid maxMemory value`);
  }

  const envInput = getStringInputUndefined('env', false);
  const env: Array<model.Env> = [];
  if (typeof envInput !== 'undefined') {
    const envYaml = yaml.load(envInput) as Record<string, string>;
    if (!Array.isArray(envYaml) && typeof envYaml === 'object') {
      Object.keys(envYaml).forEach((k) => {
        env.push({ key: k, value: envYaml[k] });
      });
    }
  }
  const probePath = getStringInputUndefined('probe_path', true);
  const probePort = getNumberInputUndefined('probe_port');
  const probeHeadersInput = getStringInputUndefined('probe_headers', true);
  const headers: Array<model.Header> = [];
  if (typeof probeHeadersInput !== 'undefined') {
    const probeHeadersYaml = yaml.load(probeHeadersInput) as Record<string, string>;
    if (!Array.isArray(probeHeadersYaml)) {
      Object.keys(probeHeadersYaml).forEach((k) => {
        headers.push({ name: k, value: probeHeadersYaml[k] });
      });
    }
  }
  let probe: model.Probe | undefined = undefined;
  if (typeof probePort !== 'undefined' && typeof probePath !== 'undefined') {
    probe = {
      http_get: {
        path: probePath,
        port: probePort,
        headers: headers,
      },
    };
  }

  const components: model.ComponentSpec[] = [
    {
      name: componentsName,
      max_cpu: maxCpu,
      max_memory: maxMemory,
      deploy_source: {
        container_registry: {
          image: image,
          server: server,
          username: username,
          password: password,
        },
      },
      env: env,
      probe: probe,
    },
  ];

  const application: model.PatchApplicationRequest = {
    name: applicationName,
    id: applicationID,
    timeout_seconds: timeoutSeconds,
    port: port,
    min_scale: minScale,
    max_scale: maxScale,
    components: components,
  };
  return application;
}
