import { App, staticFiles } from "fresh";
import { DenoKvSecurityStore } from "@/db/kv.ts";
import { SecurityService } from "@/utils/security.ts";
import { createIpBlockMiddleware } from "@/utils/middleware/ip-block.ts";
import { createProbeDetectMiddleware } from "@/utils/middleware/probe-detect.ts";
import { createRequestLogMiddleware } from "@/utils/middleware/request-log.ts";

export const app = new App();

const kv = await Deno.openKv();
const security = new SecurityService(new DenoKvSecurityStore(kv));

app.use(staticFiles());
app.use(createIpBlockMiddleware(security));
app.use(createProbeDetectMiddleware(security));
app.use(createRequestLogMiddleware());
app.fsRoutes();

if (import.meta.main) {
  await app.listen();
}
