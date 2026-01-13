import { InputOptions } from '@actions/core';
export interface FakeInput {
  application_name?: string;
  access_token?: string;
  access_secret?: string;
  timeout_seconds?: string;
  port?: string;
  min_scale?: string;
  max_scale?: string;
  image?: string;
  server?: string;
  container_registry_username?: string;
  container_registry_password?: string;
  components_name?: string;
  max_cpu?: string;
  max_memory?: string;
  env?: string;
  inherit_env?: string;
  probe_path?: string;
  probe_port?: string;
  probe_headers?: string;
  packet_filter_enabled?: string;
  packet_filter_allowlist?: string;
}

export function getFakeInput(input: FakeInput, key: string, options?: InputOptions): string {
  if (Object.keys(input).includes(key)) {
    return (input as { [key: string]: string })[key];
  } else {
    if (options?.required) {
      throw new Error(`${key} is required`);
    } else {
      return '';
    }
  }
}
export function getFakeBooleanInput(input: FakeInput, key: string, options?: InputOptions): boolean {
  const trueValue = ['true', 'True', 'TRUE'];
  const falseValue = ['false', 'False', 'FALSE'];
  let val = '';
  if (Object.keys(input).includes(key)) {
    val = (input as { [key: string]: string })[key];
  } else {
    if (options?.required) {
      throw new Error(`${key} is required`);
    }
  }
  if (trueValue.includes(val)) return true;
  if (falseValue.includes(val)) return false;
  throw new TypeError(`Input does not meet YAML 1.2 "Core Schema" specification: ${key}\n` + `Support boolean input list: \`true | True | TRUE | false | False | FALSE\``);
}
