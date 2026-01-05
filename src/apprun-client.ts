import { Buffer } from 'node:buffer';
import * as model from './model';

export class ApprunClient implements model.IApprunClient {
  private readonly authHeader: string;
  URL = 'https://secure.sakura.ad.jp/cloud/api/apprun/1.0/apprun/api/';

  constructor(accessToken: string, accessSecret: string) {
    this.authHeader = 'Basic ' + Buffer.from(`${accessToken}:${accessSecret}`).toString('base64');
  }

  async createApplication(application: model.CreateApplicationRequest): Promise<model.CreateApplicationResponse> {
    const request = new Request(`${this.URL}applications`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
      },
      body: JSON.stringify(application),
    });
    const response = await fetch(request);
    if (response.status >= 400) {
      const errText = await response.text();
      throw new Error(`Failed to create application  — ` + `status ${response.status} ${response.statusText} — ` + `URL: ${this.URL}applications — ` + `Response: ${errText}`);
    }
    const data: model.CreateApplicationResponse = await response.json();
    return data;
  }

  async getAllApplication(): Promise<model.GetAllApplicationResponse> {
    const request = new Request(`${this.URL}applications`, {
      method: 'GET',
      headers: {
        Authorization: this.authHeader,
      },
    });
    const response = await fetch(request);
    if (response.status >= 400) {
      throw new Error(`Failed to get all application — ` + `status ${response.status} ${response.statusText} — ` + `URL: ${this.URL}applications — ` + `Response: ${response.text()}`);
    }
    const body: model.GetAllApplicationResponse = await response.json();
    return body;
  }

  async patchApplication(application: model.PatchApplicationRequest): Promise<model.PatchApplicationResponse> {
    const id = application.id;
    application.id = undefined;

    const request = new Request(`${this.URL}applications/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: this.authHeader,
      },
      body: JSON.stringify(application),
    });
    const response = await fetch(request);
    if (response.status >= 400) {
      const errorText = await response.text();
      throw new Error(`Failed to patch application (id: ${id}) — ` + `status ${response.status} ${response.statusText} — ` + `URL: ${this.URL}applications/${id} — ` + `Response: ${errorText}`);
    }
    const data: model.PatchApplicationResponse = await response.json();
    return data;
  }
  async patchPacketFilter(applicationID: string, packetFilter: model.PatchPacketFilterRequest): Promise<model.PatchPacketFilterResponse> {
    const request = new Request(`${this.URL}applications/${applicationID}/packet_filter`, {
      method: 'PATCH',
      headers: {
        Authorization: this.authHeader,
      },
      body: JSON.stringify(packetFilter),
    });
    const response = await fetch(request);
    if (response.status >= 400) {
      const errorText = await response.text();
      throw new Error(
        `Failed to patch packet filter (id: ${applicationID}) — ` +
          `status ${response.status} ${response.statusText} — ` +
          `URL: ${this.URL}applications/${applicationID} — ` +
          `Response: ${errorText}`,
      );
    }
    const data: model.PatchPacketFilterResponse = await response.json();
    return data;
  }
  async getApplication(applicationID: string): Promise<model.GetApplicationResponse> {
    const request = new Request(`${this.URL}applications/${applicationID}`, {
      method: 'GET',
      headers: {
        Authorization: this.authHeader,
      },
    });
    const response = await fetch(request);
    if (response.status >= 400) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get application (id: ${applicationID}) — ` + `status ${response.status} ${response.statusText} — ` + `URL: ${this.URL}applications/${applicationID} — ` + `Response: ${errorText}`,
      );
    }
    const data: model.GetApplicationResponse = await response.json();
    return data;
  }
}
