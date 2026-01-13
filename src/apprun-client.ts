import { Buffer } from 'node:buffer';
import * as model from './model';

const URL = 'https://secure.sakura.ad.jp/cloud/api/apprun/1.0/apprun/api/';
interface AppRunClient {
  authHeader: string;
}
export const apprunClient = (accessToken: string, accessSecret: string): AppRunClient => {
  return {
    authHeader: 'Basic ' + Buffer.from(`${accessToken}:${accessSecret}`).toString('base64'),
  };
};

export async function createApplication(client: AppRunClient, application: model.CreateApplicationRequest): Promise<model.CreateApplicationResponse> {
  const request = new Request(`${URL}applications`, {
    method: 'POST',
    headers: {
      Authorization: client.authHeader,
    },
    body: JSON.stringify(application),
  });
  const response = await fetch(request);
  if (response.status >= 400) {
    const errText = await response.text();
    throw new Error(`Failed to create application  — ` + `status ${response.status} ${response.statusText} — ` + `URL: ${URL}applications — ` + `Response: ${errText}`);
  }
  return await response.json();
}

export async function getAllApplication(client: AppRunClient): Promise<model.GetAllApplicationResponse> {
  const request = new Request(`${URL}applications`, {
    method: 'GET',
    headers: {
      Authorization: client.authHeader,
    },
  });
  const response = await fetch(request);
  if (response.status >= 400) {
    throw new Error(`Failed to get all application — ` + `status ${response.status} ${response.statusText} — ` + `URL: ${URL}applications — ` + `Response: ${await response.text()}`);
  }

  return await response.json();
}

export async function patchApplication(client: AppRunClient, application: model.PatchApplicationRequest): Promise<model.PatchApplicationResponse> {
  const id = application.id;
  application.id = undefined;

  const request = new Request(`${URL}applications/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: client.authHeader,
    },
    body: JSON.stringify(application),
  });
  const response = await fetch(request);
  if (response.status >= 400) {
    const errorText = await response.text();
    throw new Error(`Failed to patch application (id: ${id}) — ` + `status ${response.status} ${response.statusText} — ` + `URL: ${URL}applications/${id} — ` + `Response: ${errorText}`);
  }
  return await response.json();
}
export async function getApplication(client: AppRunClient, applicationID: string): Promise<model.GetApplicationResponse> {
  const request = new Request(`${URL}applications/${applicationID}`, {
    method: 'GET',
    headers: {
      Authorization: client.authHeader,
    },
  });
  const response = await fetch(request);
  if (response.status >= 400) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get application (id: ${applicationID}) — ` + `status ${response.status} ${response.statusText} — ` + `URL: ${URL}applications/${applicationID} — ` + `Response: ${errorText}`,
    );
  }

  return await response.json();
}

export async function patchPacketFilter(client: AppRunClient, applicationID: string, packetFilter: model.PatchPacketFilterRequest): Promise<model.PatchPacketFilterResponse> {
  const request = new Request(`${URL}applications/${applicationID}/packet_filter`, {
    method: 'PATCH',
    headers: {
      Authorization: client.authHeader,
    },
    body: JSON.stringify(packetFilter),
  });
  const response = await fetch(request);
  if (response.status >= 400) {
    const errorText = await response.text();
    throw new Error(
      `Failed to patch packet filter (id: ${applicationID}) — ` + `status ${response.status} ${response.statusText} — ` + `URL: ${URL}applications/${applicationID} — ` + `Response: ${errorText}`,
    );
  }
  return await response.json();
}
