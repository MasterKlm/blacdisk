import { Entry } from '@napi-rs/keyring';
import { checkBillingStatus, discoverEndpoints } from "./auth.js";
import chalk from 'chalk';
const SERVICE = 'blacdisk';
export function saveTokens(tokens) {
    new Entry(SERVICE, 'access_token').setPassword(tokens.access_token);
    new Entry(SERVICE, 'refresh_token').setPassword(tokens.refresh_token);
    new Entry(SERVICE, 'meta').setPassword(JSON.stringify({ expires_in: tokens.expires_in, issued_at: Date.now() }));
}
export function loadTokens() {
    try {
        const access_token = new Entry(SERVICE, 'access_token').getPassword();
        const refresh_token = new Entry(SERVICE, 'refresh_token').getPassword();
        const metaRaw = new Entry(SERVICE, 'meta').getPassword();
        if (!access_token || !refresh_token || !metaRaw)
            return null;
        const { expires_in, issued_at } = JSON.parse(metaRaw);
        return { access_token, refresh_token, expires_in, issued_at };
    }
    catch {
        return null;
    }
}
export function clearTokens() {
    for (const key of ['access_token', 'refresh_token', 'meta']) {
        try {
            new Entry(SERVICE, key).deletePassword();
        }
        catch {
            // no-op if nothing stored under this key
        }
    }
}
const EXPIRY_BUFFER_MS = 30_000; // refresh 30s before actual expiry, avoid edge-of-window failures
export async function getValidAccessToken() {
    const session = loadTokens();
    if (!session)
        return null;
    const expiresAt = session.issued_at + session.expires_in * 1000;
    const stillValid = Date.now() < expiresAt - EXPIRY_BUFFER_MS;
    if (stillValid)
        return session.access_token;
    // expired — try refreshing
    try {
        const config = await discoverEndpoints(process.env.CLERK_ISSUER_URL);
        const res = await fetch(config.token_endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: session.refresh_token,
                client_id: process.env.CLERK_OAUTH_CLIENT_ID,
            }),
        });
        if (!res.ok) {
            clearTokens();
            return null;
        }
        const fresh = await res.json();
        saveTokens(fresh);
        return fresh.access_token;
    }
    catch {
        clearTokens();
        return null;
    }
}
export async function isLoggedIn() {
    return (await getValidAccessToken()) !== null;
}
//# sourceMappingURL=sessions.js.map