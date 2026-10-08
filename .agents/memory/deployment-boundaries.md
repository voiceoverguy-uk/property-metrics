---
name: Deployment boundaries
description: Separate website hosting from Replit preview and native mobile publishing
---
The website has an independent GitHub-connected Vercel publishing pipeline. Do not treat a successful Replit preview or Replit publish as evidence that its Vercel deployment succeeded.

**Why:** After the native companion migration, Vercel inherited a workspace-wide build and failed on the design sandbox's development-only port requirement rather than on website code.

**How to apply:** Keep external website builds scoped to the website and its calculation API. Preserve Replit-managed artifact workflows and the separate native publishing flow. When giving Vercel retry instructions, require the new code revision rather than redeploying the old failed revision.

Do not assume persistent filesystem writes are portable between Replit services and Vercel functions.

**Why:** Optional server-side cost-label collection depends on writable persistent storage, while core saved deals remain in the browser.

**How to apply:** Disclose disabled server collection on Vercel and fail explicitly until durable storage is intentionally selected. Do not silently use temporary files as permanent storage.
