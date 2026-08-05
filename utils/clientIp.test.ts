import { assertEquals } from "@std/assert";
import { getClientIp } from "@/utils/clientIp.ts";

Deno.test("getClientIp — reads hostname from a tcp remoteAddr", () => {
  const addr: Deno.Addr = {
    transport: "tcp",
    hostname: "203.0.113.5",
    port: 443,
  };
  assertEquals(getClientIp(addr), "203.0.113.5");
});

Deno.test("getClientIp — works for IPv6", () => {
  const addr: Deno.Addr = {
    transport: "tcp",
    hostname: "2001:db8::1",
    port: 443,
  };
  assertEquals(getClientIp(addr), "2001:db8::1");
});

Deno.test("getClientIp — falls back to path for unix sockets", () => {
  const addr: Deno.Addr = { transport: "unix", path: "/tmp/socket" };
  assertEquals(getClientIp(addr), "/tmp/socket");
});
