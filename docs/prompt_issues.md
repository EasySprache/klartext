# KlarText Prompt Consistency Report

This report documents the current state of prompt handling across the project, identifying points of duplication and broken connections.

## 1. Prompt Locations & Responsibility

| Location | Role | Version | Content Source |
| :--- | :--- | :--- | :--- |
| `services/api/prompts/templates/` | **Source of Truth** (Runtime) | **v1** | Hardcoded Copy |
| `prompts/templates/v1/` | Baseline Backup | v1 | Master Copy |
| `prompts/templates/v2/` | Future Prompts | v2 | Master Copy (Unused) |
| `prompts/development/` | Research | N/A | Notebooks Only |

## 2. Component Call Pathways: Truth vs. Reality

### 🛠️ The Chrome Extension (The "Ghost Version")
*   **The Config Claim**: In `apps/extension/config.js:L46`, the code says: `CURRENT_TEMPLATE_VERSION: 'v2'`.
*   **The Actual Call**: When it calls the API (in `simplify.js:L256`), it **never sends this version**. It only sends text and language.
*   **The Result**: The API has no idea the extension wants "v2". Even if it did, the API's local folder only contains "v1" prompts. 
*   **Status**: **Broken**. The extension thinks it's testing v2, but it's getting v1 output every time.

### 🌐 The Web-MVP
*   **The Actual Call**: Calls `/v1/simplify` with text and language.
*   **The Result**: Receives the output from the prompts in `services/api/prompts/templates` (which are v1).
*   **Status**: Consistent, but technically "out of date" compared to the v2 master prompts.

## 3. The "Mess" Identified

### Why it's "Broken"
1.  **Ghost Settings**: The `apps/extension/config.js` has a `CURRENT_TEMPLATE_VERSION: 'v2'` setting that is functionally a lie. It doesn't affect the API call, and the API doesn't support version selection anyway.
2.  **Hardcoded Duplication**: The API does not link to the root `prompts` directory. It uses a **physical copy** at `services/api/prompts/templates`. If you update the root prompts, the API won't notice.
3.  **Purged "Level" Logic**: While the API models still accept a `level` parameter, the backend implementation is hardcoded to use a single set of templates. This "feature" is dead and should be removed from all future documentation.

## 4. Immediate Cleanup Recommendations

1.  **Synchronize API Prompts**: If you want the API to actually use the "improved" prompts, the contents of `prompts/templates/v2/` must be copied into `services/api/prompts/templates/`.
2.  **Harmonize Configs**: Update `apps/extension/config.js` to accurately reflect `v1` (to match reality) or update the API to `v2` as mentioned above.
3.  **Remove Dead Code**: Clear out the unused `level` parameter logic from `services/api/app/main.py` and `services/api/app/core/llm_adapter.py` to stop the confusion.
