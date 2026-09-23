import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Deliberately no R2 cache: PostgreSQL is the only application datastore.
export default defineCloudflareConfig({});
