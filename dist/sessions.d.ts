interface StoredSession {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    issued_at: number;
}
interface IncomingTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    id_token?: string;
}
export declare function saveTokens(tokens: IncomingTokens): void;
export declare function loadTokens(): StoredSession | null;
export declare function clearTokens(): void;
export declare function getValidAccessToken(): Promise<string | null>;
export declare function isLoggedIn(): Promise<boolean>;
export {};
//# sourceMappingURL=sessions.d.ts.map