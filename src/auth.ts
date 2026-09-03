import http from 'node:http';
import crypto from 'node:crypto';
import open from 'open';
import { getValidAccessToken, saveTokens } from './sessions.ts';
import chalk from 'chalk';
import { sleep } from './utils.ts';

interface OidcConfig {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  issuer: string;
}

export async function discoverEndpoints(issuer: string): Promise<OidcConfig> {
  const res = await fetch(`${issuer}/.well-known/openid-configuration`);
  if (!res.ok) throw new Error(`Discovery failed: ${res.status}`);
  return res.json();
}

function base64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

export async function clerkCliLogin(clientId: string, issuer: string): Promise<AuthTokenResponse> {
  const config = await discoverEndpoints(issuer);

  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  const state = base64url(crypto.randomBytes(16));

  const server = http.createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as import('node:net').AddressInfo).port;
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  const codePromise = new Promise<string>((resolve, reject) => {
    server.on('request', (req, res) => {
      const url = new URL(req.url ?? '', redirectUri);
      if (url.pathname !== '/callback') {
        res.writeHead(404).end();
        return;
      }
      const returnedState = url.searchParams.get('state');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400).end(`Login failed: ${error}`);
        reject(new Error(`OAuth error: ${error}`));
        return;
      }
      if (returnedState !== state || !code) {
        res.writeHead(400).end('Invalid state or missing code');
        reject(new Error('State mismatch — possible CSRF, aborting'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body>Signed in — you can close this tab and return to your terminal.</body></html>');
      resolve(code);
    });
  });

  const authUrl = new URL(config.authorization_endpoint);
  authUrl.search = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  }).toString();

  console.log('Opening browser to sign in...');
  await open(authUrl.toString());

  let code: string;
  try {
    code = await codePromise;
  } finally {
    server.close();
  }

  const tokenRes = await fetch(config.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }

  return tokenRes.json();
}

export async function loginCommand() {
  try {
    //@ts-ignore
    const tokens = await clerkCliLogin(process.env.CLERK_OAUTH_CLIENT_ID, process.env.CLERK_ISSUER_URL);
    saveTokens(tokens);
    console.log(chalk.green('✔ Logged in successfully.'));
  } catch (err) {
    console.error('✖ Login failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const token = await getValidAccessToken();
  if (!token) return null;

  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;

    // Decode base64url payload
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const decodedJson = Buffer.from(base64, 'base64').toString('utf-8');
    const payload = JSON.parse(decodedJson);

    // OIDC standard stores the user ID in the 'sub' (subject) claim
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export interface BillingStatus {
  hasPaymentMethod: boolean;
  freeTokensRemaining: number;
  email: string;
}

const BILLING_STATUS_ENDPOINT = 'https://www.blacdisk.com/api/billing-status';

/**
 * Separate from isLoggedIn() on purpose -- isLoggedIn() only answers
 * "is this session valid," and billing status is a different question
 * (a perfectly logged-in user can still be out of free tokens with no
 * card on file). Call this wherever you actually need to know that,
 * rather than folding it into the session check.
 *
 * Returns null if the user isn't logged in, or if the check itself fails
 * (network error, server error, etc.) -- callers should treat null as
 * "couldn't determine billing status," not "definitely no payment method."
 */
export async function checkBillingStatus(): Promise<BillingStatus | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  try {
    const res = await fetch(BILLING_STATUS_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error('Billing status check failed:', res.status, await res.text().catch(() => ''));
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('Billing status check failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function requestCard(status: BillingStatus): Promise<BillingStatus> {
  console.log(chalk.yellow('Your free tokens are used up. Add a payment method to continue. Opening browser...'));
  const clerkUserId = await getCurrentUserId();

  const checkoutUrl =
    `https://www.blacdisk.com/api/checkout?products=${process.env.POLAR_PRODUCT_ID}` +
    `&customerExternalId=${clerkUserId}` +
    `&customerEmail=${encodeURIComponent(status.email ?? '')}`;
  await open(checkoutUrl);

  console.log(chalk.dim('Waiting for checkout to complete...'));

  // Poll checkBillingStatus() until hasPaymentMethod flips true (set by
  // your Polar webhook once checkout succeeds), instead of killing the
  // process. Bounded with a max wait so an abandoned browser tab doesn't
  // hang the CLI forever.
  const POLL_INTERVAL_MS = 3000;
  const MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutes
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    await sleep(POLL_INTERVAL_MS); // must be awaited -- sleep() returns a promise, unawaited it does nothing

    const latest = await checkBillingStatus();
    if (latest?.hasPaymentMethod) {
      console.log(chalk.green('✔ Payment method added. Continuing...'));
      return latest;
    }
    // latest === null means the check itself failed (network blip, etc.)
    // -- keep polling rather than giving up on a transient error.
  }

  throw new Error(
    'Timed out waiting for a payment method to be added. Run the command again once checkout is complete.'
  );
}