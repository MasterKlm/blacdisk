interface ModelOption {
    key: string;
    label: string;
    tag: string;
}
export declare const MODELS: ModelOption[];
export interface ClaudeSessionConfig {
    selectedModel: string;
    effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}
declare function configureClaudeSession(): Promise<ClaudeSessionConfig>;
export { configureClaudeSession };
//# sourceMappingURL=configureClaudeSession.d.ts.map