/**
 * Service principal authentication for SAKURA Cloud.
 *
 * Instead of an API key (access token / secret), a service principal signs a
 * short-lived JWT with its RSA private key and exchanges it for a bearer token.
 *
 *   1. Build a JWT: header { alg: RS256, kid: <KID>, typ: JWT },
 *      payload { iss, sub: <resource id>, aud: <token endpoint>, iat, exp }.
 *   2. POST it to the token endpoint as an RFC 7523 jwt-bearer assertion.
 *   3. Use the returned access token as `Authorization: Bearer <token>`.
 *
 * See https://manual.sakura.ad.jp/cloud/controlpanel/service-principal.html
 */
import { Buffer } from 'node:buffer';
import { createSign } from 'node:crypto';

export const TOKEN_ENDPOINT = 'https://secure.sakura.ad.jp/cloud/api/iam/1.0/service-principals/oauth2/token';

/** The private key must not outlive the request by much; the doc allows 5 minutes. */
const ASSERTION_LIFETIME_SECONDS = 300;

export interface ServicePrincipal {
  /** Resource ID of the service principal. Used as both `iss` and `sub`. */
  resourceId: string;
  /** Key ID assigned when the public key was registered. */
  kid: string;
  /** RSA private key in PEM format (PKCS#1 or PKCS#8). */
  privateKey: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  token_expired_at?: string;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Build the signed assertion. Exported so it can be tested without network access.
 *
 * @param principal service principal credentials
 * @param now       current time in seconds since the epoch (injectable for tests)
 */
export function createAssertion(principal: ServicePrincipal, now: number = Math.floor(Date.now() / 1000)): string {
  const header = { alg: 'RS256', kid: principal.kid, typ: 'JWT' };
  const payload = {
    aud: TOKEN_ENDPOINT,
    exp: now + ASSERTION_LIFETIME_SECONDS,
    iat: now,
    iss: principal.resourceId,
    sub: principal.resourceId,
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  let signature: Buffer;
  try {
    signature = signer.sign(principal.privateKey);
  } catch (error) {
    throw new Error(`Failed to sign the assertion with the service principal private key: ${(error as Error).message}`, { cause: error });
  }
  return `${signingInput}.${base64url(signature)}`;
}

/** Exchange a signed assertion for a bearer access token. */
export async function fetchAccessToken(principal: ServicePrincipal): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: createAssertion(principal),
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (response.status >= 400) {
    const errorText = await response.text();
    throw new Error(`Failed to obtain a service principal access token — status ${response.status} ${response.statusText} — URL: ${TOKEN_ENDPOINT} — Response: ${errorText}`);
  }

  const token = (await response.json()) as TokenResponse;
  if (!token.access_token) {
    throw new Error(`The token endpoint did not return an access token — URL: ${TOKEN_ENDPOINT}`);
  }
  return token.access_token;
}
