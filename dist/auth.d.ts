interface OidcConfig {
    authorization_endpoint: string;
    token_endpoint: string;
    userinfo_endpoint: string;
    jwks_uri: string;
    issuer: string;
}
export declare function discoverEndpoints(issuer: string): Promise<OidcConfig>;
export interface AuthTokenResponse {
    access_token: string;
    refresh_token: string;
    id_token: string;
    expires_in: number;
    token_type: string;
}
export declare function clerkCliLogin(clientId: string, issuer: string): Promise<AuthTokenResponse>;
export declare function loginCommand(): Promise<void>;
export declare function getCurrentUserId(): Promise<string | null>;
export interface BillingStatus {
    hasPaymentMethod: boolean;
    freeTokensRemaining: number;
    email: string;
}
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
export declare function checkBillingStatus(): Promise<BillingStatus | null>;
export declare function requestCard(status: BillingStatus): Promise<BillingStatus>;
export {};
//# sourceMappingURL=auth.d.ts.map