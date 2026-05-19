import { App, staticFiles } from "fresh";
import { SecurityService } from "@/utils/security.ts";
import { createIpBlockMiddleware } from "@/utils/middleware/ip-block.ts";
import { createProbeDetectMiddleware } from "@/utils/middleware/probe-detect.ts";

export const app = new App();

const kv = await Deno.openKv();
const security = new SecurityService(kv);

app.use(staticFiles());
app.use(createIpBlockMiddleware(security));
app.use(createProbeDetectMiddleware(security));
app.fsRoutes();

if (import.meta.main) {
  await app.listen();
}
