/**
 * The client's IP as seen by the raw TCP connection Deno Deploy handed us.
 * Unlike `X-Forwarded-For`, this can't be spoofed by request headers — it's
 * derived from the socket, not client-supplied data.
 */
export function getClientIp(remoteAddr: Deno.Addr): string {
  if ("hostname" in remoteAddr) return remoteAddr.hostname;
  if ("path" in remoteAddr) return remoteAddr.path;
  return `cid:${remoteAddr.cid}`;
}
