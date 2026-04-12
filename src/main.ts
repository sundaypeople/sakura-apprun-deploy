import { setOutput, setFailed } from '@actions/core';
import { apprunClient, getAllApplication, patchPacketFilter, createApplication, getApplication, patchApplication } from './apprun-client';
import { getAPIKey, getConfig, replaceEnv } from './actions-configration';
import * as model from './model';

export async function run(): Promise<void> {
  try {
    const keys = getAPIKey();
    const client = apprunClient(keys.token, keys.secret);

    const applications = await getAllApplication(client);
    const nameToIdMap = new Map<string, string>();
    for (const data of applications.data) {
      nameToIdMap.set(data.name, data.id);
    }
    const [application, packetFilter, inheritEnv] = getConfig(nameToIdMap);
    let publicURL = '';
    if (!('id' in application)) {
      const result = await createApplication(client, application as model.CreateApplicationRequest);
      // AppRun Shared doesn't have a dedicated secrets store.
      // Secrets should be passed as environment variables and must be masked in logs.
      const showResult = structuredClone(result);
      showResult.components.forEach((component) => {
        component.env?.forEach((env) => {
          env.value = '***';
        });
      });
      console.log('create application:\n', JSON.stringify(showResult, null, 2));
      const resultPacketFilter = await patchPacketFilter(client, result.id, packetFilter);
      console.log('patch packet filter:\n', JSON.stringify(resultPacketFilter, null, 2));
      publicURL = result.public_url;
    } else {
      let sendAppParam = application;
      if (inheritEnv) {
        if (typeof application.id === 'string') {
          const result = await getApplication(client, application.id);
          sendAppParam = replaceEnv(application, result);
        }
      }
      const result = await patchApplication(client, sendAppParam);
      // AppRun Shared doesn't have a dedicated secrets store.
      // Secrets should be passed as environment variables and must be masked in logs.
      const showResult = structuredClone(result);
      showResult.components.forEach((component) => {
        component.env?.forEach((env) => {
          env.value = '***';
        });
      });
      console.log('update application:\n', JSON.stringify(showResult, null, 2));
      const resultPacketFilter = await patchPacketFilter(client, result.id, packetFilter);
      console.log('patch packet filter:\n', JSON.stringify(resultPacketFilter, null, 2));
      publicURL = result.public_url;
    }
    setOutput('public_url', publicURL);
  } catch (error) {
    setFailed((error as Error).message);
  }
}
