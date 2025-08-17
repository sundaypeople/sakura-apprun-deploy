import * as model from '../src/model';
import { jest } from '@jest/globals';

export const mockGetAllApplication = jest.fn((): Promise<model.GetAllApplicationResponse> => {
  const mockData: model.GetAllApplicationResponse = {
    data: [
      {
        id: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc',
        name: 'test-application',
        status: 'Healthy',
        public_url: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc.apprun.sakura.ne.jp',
        created_at: '2019-08-24T14:15:22Z',
      },
    ],
  };
  return Promise.resolve(mockData);
});

export const mockCreateApplication = jest.fn((application: model.CreateApplicationRequest): Promise<model.CreateApplicationResponse> => {
  const mockData: model.CreateApplicationResponse = {
    id: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc',
    name: application.name,
    timeout_seconds: application.timeout_seconds,
    port: application.port,
    max_scale: application.max_scale,
    min_scale: application.min_scale,
    components: application.components,
    status: 'Healthy',
    resource_id: '100000000000',
    created_at: '2019-08-24T14:15:22Z',
    public_url: '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc.apprun.sakura.ne.jp',
  };
  return Promise.resolve(mockData);
});

export const mockPatchApplication = jest.fn((application: model.PatchApplicationRequest): Promise<model.PatchApplicationResponse> => {
  const mockData: model.PatchApplicationResponse = {
    id: typeof application.id === 'undefined' ? '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc' : application.id,
    name: typeof application.name === 'undefined' ? '' : application.name,
    timeout_seconds: typeof application.timeout_seconds === 'undefined' ? 0 : application.timeout_seconds,
    port: typeof application.port === 'undefined' ? 0 : application.port,
    max_scale: typeof application.max_scale === 'undefined' ? 0 : application.max_scale,
    min_scale: typeof application.min_scale === 'undefined' ? 0 : application.min_scale,
    components: application.components ? (Array.isArray(application.components) ? application.components : Object.values(application.components)) : [],
    resource_id: '100000000000',
    status: 'Healthy',
    update_at: '2019-08-24T14:15:22Z',
    public_url: typeof application.id === 'undefined' ? '0e63e868-ee29-4cd2-bbd1-79f3c10d19cc.apprun.sakura.ne.jp' : `${application.id}.apprun.sakura.ne.jp`,
  };
  return Promise.resolve(mockData);
});

export const MockApprunClient = jest.fn().mockImplementation(() => {
  return {
    getAllApplication: mockGetAllApplication,
    createApplication: mockCreateApplication,
    patchApplication: mockPatchApplication,
  };
});
