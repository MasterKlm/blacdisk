import 'dotenv/config';
export declare const sleep: (ms: number) => Promise<unknown>;
export declare function getClaudeImageInputTokens(imagePaths: string[], model: string): Promise<number>;
export declare function getClaudeTextInputTokens(prompt: string, model: string): Promise<number>;
export declare function getClaudeTextFileInputTokens(filePath: string, model: string): Promise<number>;
export declare function calcPercentageChanged(newValue: number, oldValue: number): number;
export declare function getFileContent(filePath: string): string;
export declare function getPsuedoRandomIntInclusive(min: number, max: number): number;
//# sourceMappingURL=utils.d.ts.map