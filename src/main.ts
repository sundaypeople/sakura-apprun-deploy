import { setOutput, setFailed } from '@actions/core';
import { ApprunClient } from './apprun-client';
import { getAPIKey, getConfig, replaceEnv } from './actions-configration';
import * as model from './model';

export async function run(): Promise<void> {
  try {
    const keys = getAPIKey();
    const client = new ApprunClient(keys.token, keys.secret);

    const applications = await client.getAllApplication();
    const nameToIdMap = new Map<string, string>();
    for (const data of applications.data) {
      nameToIdMap.set(data.name, data.id);
    }
    const [application, packetFilter, inheritEnv] = getConfig(nameToIdMap);
    let publicURL = '';
    if (!('id' in application)) {
      const result = await client.createApplication(application as model.CreateApplicationRequest);
      console.log('create application:\n', JSON.stringify(result, null, 2));
      const resultPacketfilter = await client.patchPacketFilter(result.id, packetFilter);
      console.log('patch packet filter:\n', JSON.stringify(resultPacketfilter, null, 2));
      publicURL = result.public_url;
    } else {
      let sendAppParam = application;
      if (inheritEnv) {
        if (typeof application.id === 'string') {
          const result = await client.getApplication(application.id);
          sendAppParam = replaceEnv(application, result);
        }
      }
      const result = await client.patchApplication(sendAppParam);
      console.log('update application:\n', JSON.stringify(result, null, 2));
      const resultPacketfilter = await client.patchPacketFilter(result.id, packetFilter);
      console.log('patch packet filter:\n', JSON.stringify(resultPacketfilter, null, 2));
      publicURL = result.public_url;
    }
    setOutput('public_url', publicURL);
  } catch (error) {
    setFailed((error as Error).message);
  }
}
