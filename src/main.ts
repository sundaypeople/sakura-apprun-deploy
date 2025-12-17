import { setOutput, setFailed } from '@actions/core';
import { ApprunClient } from './apprun-client';
import { getAPIKey, getConfig } from './actions-configration';
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
    const [application, packetFilter] = getConfig(nameToIdMap);
    let publicURL = '';
    if (!('id' in application)) {
      const result = await client.createApplication(application as model.CreateApplicationRequest);
      console.log('create application:\n', JSON.stringify(result, null, 2));
      const resultPacketfilter = await client.patchPacketFilter(result.id, packetFilter);
      console.log('patch packet filter:\n', JSON.stringify(resultPacketfilter, null, 2));
      publicURL = result.public_url;
    } else {
      const result = await client.patchApplication(application);
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
