import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listMatters from "./tools/list-matters";
import getMatterSummary from "./tools/get-matter-summary";
import listMatterEvents from "./tools/list-matter-events";
import listMatterDocuments from "./tools/list-matter-documents";
import listCourtEvents from "./tools/list-court-events";
import listNotifications from "./tools/list-notifications";
import listCollectionMatters from "./tools/list-collection-matters";
import getCollectionBalance from "./tools/get-collection-balance";
import logClientUpdate from "./tools/log-client-update";

const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "evict-os",
  title: "Evict OS",
  version: "1.0.0",
  instructions:
    "Evict OS case management tools. Read-only tools let assistants look up matters, timelines, court events, documents, and collections for the connected user. Admin users may also log client-visible updates.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listMatters,
    getMatterSummary,
    listMatterEvents,
    listMatterDocuments,
    listCourtEvents,
    listNotifications,
    listCollectionMatters,
    getCollectionBalance,
    logClientUpdate,
  ],
});
