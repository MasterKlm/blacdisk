export const STRICT_SYSTEM_PROMPT = `
    <operational_constraints>
    You are operating via an automated script in a token-constrained environment. To prevent token waste, you must adhere to these strict project rules:

    1. NO BROWSING: Do not use tools to search, list, or explore the directory structure.
    2. USE PROVIDED CONTEXT (@): Strictly rely ONLY on the file contents explicitly provided in this prompt via @ directives. 
    3. TARGET FILEPATHS (#): A list of relevant source code filepaths is provided, characterized by the # prefix (e.g., #src/button.h). 
    4. STRICT READ/EDIT WORKFLOW: You may use the Read tool, but ONLY on the specific # filepaths you decide must absolutely be edited to fulfill the request. 
    5. EXECUTION: Once you have read a target file, immediately use the Edit tool to apply the changes. Do not read any files you do not plan to modify.
    </operational_constraints>
`;
//# sourceMappingURL=sys.js.map