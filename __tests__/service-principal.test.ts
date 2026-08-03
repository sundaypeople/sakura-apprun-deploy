import { afterEach, describe, expect, it, vi } from 'vitest';
import { Buffer } from 'node:buffer';
import { createVerify, generateKeyPairSync } from 'node:crypto';
import { createAssertion, fetchAccessToken, TOKEN_ENDPOINT } from '../src/service-principal';
import { getCredentials, normalizePrivateKey } from '../src/actions-configration';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const principal = {
  resourceId: '123456789012',
  kid: 'kid-abcdef',
  privateKey,
};

function decodeSegment(segment: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(segment.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
}

describe('createAssertion', () => {
  it('produces a three part JWS', () => {
    expect(createAssertion(principal, 1_700_000_000).split('.')).toHaveLength(3);
  });

  it('sets the header fields required by the manual', () => {
    const [header] = createAssertion(principal, 1_700_000_000).split('.');
    expect(decodeSegment(header)).toEqual({ alg: 'RS256', kid: 'kid-abcdef', typ: 'JWT' });
  });

  it('sets the claims required by the manual', () => {
    const now = 1_700_000_000;
    const [, payload] = createAssertion(principal, now).split('.');
    expect(decodeSegment(payload)).toEqual({
      aud: TOKEN_ENDPOINT,
      exp: now + 300,
      iat: now,
      iss: principal.resourceId,
      sub: principal.resourceId,
    });
  });

  it('expires within five minutes', () => {
    const now = 1_700_000_000;
    const [, payload] = createAssertion(principal, now).split('.');
    const claims = decodeSegment(payload) as { exp: number; iat: number };
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(300);
  });

  it('signs the assertion so the public key can verify it', () => {
    const assertion = createAssertion(principal, 1_700_000_000);
    const [header, payload, signature] = assertion.split('.');
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${header}.${payload}`);
    verifier.end();
    expect(verifier.verify(publicKey, Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64'))).toBe(true);
  });

  it('emits base64url without padding', () => {
    expect(createAssertion(principal, 1_700_000_000)).not.toMatch(/[+/=]/);
  });

  it('fails with a clear message when the key is not usable', () => {
    expect(() => createAssertion({ ...principal, privateKey: 'not a key' }, 1)).toThrow(/service principal private key/);
  });
});

describe('normalizePrivateKey', () => {
  it('passes a PEM through unchanged', () => {
    expect(normalizePrivateKey(`  ${privateKey}  `)).toBe(privateKey.trim());
  });

  it('decodes a base64 encoded PEM', () => {
    expect(normalizePrivateKey(Buffer.from(privateKey).toString('base64'))).toBe(privateKey.trim());
  });

  it('rejects anything that is not a private key', () => {
    expect(() => normalizePrivateKey('aGVsbG8=')).toThrow(/PEM private key/);
  });
});

describe('fetchAccessToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exchanges a jwt-bearer assertion for the access token', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ access_token: 'issued-token', token_type: 'Bearer', expires_in: 3600 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchAccessToken(principal)).toBe('issued-token');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(TOKEN_ENDPOINT);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/x-www-form-urlencoded');
    const body = new URLSearchParams(init.body as string);
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    expect(body.get('assertion')?.split('.')).toHaveLength(3);
  });

  it('reports the status and the body when the endpoint rejects the assertion', async () => {
    vi.stubGlobal('fetch', async () => new Response('{"error":"invalid_grant"}', { status: 400, statusText: 'Bad Request' }));
    await expect(fetchAccessToken(principal)).rejects.toThrow(/status 400 .*invalid_grant/s);
  });

  it('fails when the response carries no access token', async () => {
    vi.stubGlobal('fetch', async () => new Response('{"token_type":"Bearer"}', { status: 200 }));
    await expect(fetchAccessToken(principal)).rejects.toThrow(/did not return an access token/);
  });
});

describe('getCredentials', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function stubServicePrincipal(key: string = privateKey) {
    vi.stubEnv('INPUT_SERVICE_PRINCIPAL_RESOURCE_ID', principal.resourceId);
    vi.stubEnv('INPUT_SERVICE_PRINCIPAL_KID', principal.kid);
    vi.stubEnv('INPUT_SERVICE_PRINCIPAL_PRIVATE_KEY', key);
  }

  it('reads the service principal inputs', () => {
    stubServicePrincipal();
    expect(getCredentials()).toEqual({
      kind: 'servicePrincipal',
      principal: { resourceId: principal.resourceId, kid: principal.kid, privateKey: privateKey.trim() },
    });
  });

  it('accepts a base64 encoded private key', () => {
    stubServicePrincipal(Buffer.from(privateKey).toString('base64'));
    expect(getCredentials()).toEqual({
      kind: 'servicePrincipal',
      principal: { resourceId: principal.resourceId, kid: principal.kid, privateKey: privateKey.trim() },
    });
  });

  it('rejects a partially configured service principal', () => {
    vi.stubEnv('INPUT_SERVICE_PRINCIPAL_RESOURCE_ID', principal.resourceId);
    vi.stubEnv('INPUT_SERVICE_PRINCIPAL_KID', principal.kid);
    expect(() => getCredentials()).toThrow(/must be set together/);
  });

  it('falls back to the API key when no service principal is configured', () => {
    vi.stubEnv('INPUT_ACCESS_TOKEN', 'access-token');
    vi.stubEnv('INPUT_ACCESS_SECRET', 'access-secret');
    expect(getCredentials()).toEqual({ kind: 'apiKey', access: { token: 'access-token', secret: 'access-secret' } });
  });

  it('names both authentication methods when nothing is configured', () => {
    expect(() => getCredentials()).toThrow(/set either access_token and access_secret, or service_principal_/);
  });

  it('still reports the missing half of an incomplete API key', () => {
    vi.stubEnv('INPUT_ACCESS_SECRET', 'access-secret');
    expect(() => getCredentials()).toThrow(/access_token/);
  });

  it('prefers the service principal when both are configured', () => {
    stubServicePrincipal();
    vi.stubEnv('INPUT_ACCESS_TOKEN', 'access-token');
    vi.stubEnv('INPUT_ACCESS_SECRET', 'access-secret');
    expect(getCredentials()).toMatchObject({ kind: 'servicePrincipal' });
  });
});
