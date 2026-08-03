# MCP Server for Evict OS

## What an MCP server would mean for your app

An MCP (Model Context Protocol) server exposes Evict OS as a set of tools that external AI assistants — ChatGPT, Claude, Cursor, Codex, etc. — can call. Instead of just reading about your app, an assistant with your MCP server connected could:

- List cases/matters and their current status
- Read case timelines, milestones, and court dates
- Summarize client-visible updates and documents
- Log notes or update case status on your behalf (if you approve)
- Query collection balances, referral status, or attorney assignments

Each connection is signed in as a real user of your app, so the caller sees only the data that user is allowed to see (RLS applies). Your own admin staff could connect their assistant to do status lookups; clients could connect if you want to let them query their own matters via AI chat.

## Recommended auth path: Supabase OAuth 2.1

Evict OS has user accounts and strict per-client/per-role data isolation, so the MCP server must be protected with OAuth. Callers sign in as an authenticated user of your app. This is the default and recommended path. A public, unauthenticated MCP server would expose all client data to the internet and is not appropriate for this app.

## Tools to expose (first pass)

Read-only tools are the safest starting point. The first version would expose:

- `list_matters` — matters for the signed-in user, with status and client filters
- `get_matter_summary` — single matter header, status, matter type, next action, balance
- `list_matter_events` — chronological timeline/events for a matter
- `list_matter_documents` — client-visible or admin documents depending on caller
- `list_court_events` — upcoming hearings for the caller's scope
- `list_notifications` — unread in-app notifications for the caller
- `list_collection_matters` — collection/debt matters the caller can see
- `get_collection_balance` — current balance snapshot for a collection matter
- `log_client_update` — (admin-only) post a client-visible update note and create a notification

Writing tools (status change, filing approval, document upload) can be added later behind explicit approval requirements.

## Implementation steps

1. Install `@lovable.dev/mcp-js` and `zod`.
2. Create `src/lib/mcp/index.ts` with the MCP entry using the app title "Evict OS" and slug `evict-os`.
3. Create `src/lib/mcp/supabase.ts` with the lazy Supabase client factory (anon and user-token clients).
4. Create one tool per file under `src/lib/mcp/tools/`, starting with the read-only tools above.
5. Wire OAuth in `src/lib/mcp/index.ts` using the direct Supabase issuer (`https://<project-ref>.supabase.co/auth/v1`) and the project ID from `import.meta.env.VITE_SUPABASE_PROJECT_ID`.
6. Add `mcpPlugin()` to `vite.config.ts`.
7. Add the consent route at `/.lovable/oauth/consent` using `src/pages/OAuthConsent.tsx` or similar, preserving the redirect URL after sign-in.
8. Ensure a favicon exists in `public/` so connector lists show the app icon.
9. Run the manifest extractor after authoring to generate `.lovable/mcp/manifest.json`.
10. Deploy the `mcp` edge function after any change to the MCP entry or tools.

## Validation

After deployment:

- A logged-in user can connect the MCP server via OAuth and list their matters.
- A logged-out caller is rejected with a 401.
- A client user connected via MCP can only see their own cases and client-visible documents.
- An admin user connected via MCP can see all cases they already have access to in the app.
- MCP clients receive the tool list and can invoke the read-only tools successfully.

## Risks and decisions

- Start with read-only tools; every write tool must be reviewed for whether it should require user approval in the MCP client.
- OAuth consent screen copy must clearly state what the connected assistant can access.
- The published URL's `/favicon.ico` is used as the server icon in connector lists.
