import type * as core from '@actions/core';
import { jest } from '@jest/globals';

const originalModule = jest.requireActual<typeof import('@actions/core')>('@actions/core');
const debug = jest.fn<typeof core.debug>();
const error = jest.fn<typeof core.error>();
const info = jest.fn<typeof core.info>();
//  const getInput = jest.fn<typeof core.getInput>()
const setOutput = jest.fn<typeof core.setOutput>();
const setFailed = jest.fn<typeof core.setFailed>();
const warning = jest.fn<typeof core.warning>();

export const mockCore = {
  ...originalModule,
  debug,
  error,
  info,
  setOutput,
  setFailed,
  warning,
};
