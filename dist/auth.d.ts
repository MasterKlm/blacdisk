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
export declare function checkBillingStatus(): Promise<BillingStatus | null>;
export declare function requestCard(status: BillingStatus): Promise<BillingStatus>;
export {};
//# sourceMappingURL=auth.d.ts.map