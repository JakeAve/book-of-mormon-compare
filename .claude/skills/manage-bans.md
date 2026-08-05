---
name: manage-bans
description: Use when checking how many/which IPs are banned, or releasing a banned IP, via the site's admin bans endpoint (`routes/bans.ts`). Triggers on "unban", "release a ban", "how many banned IPs", "list banned IPs", "ADMIN_TOKEN".
---

# Manage Bans

`SecurityService` (`utils/security.ts`) permanently bans IPs that probe for
secrets or hammer 404s (see `db/kv.ts`, `KV_KEYS.BAN`). The only way to
inspect or release bans is `GET`/`DELETE /bans`, an admin-token-protected
route — there is no external KV access on this Deno Deploy platform (see
`routes/bans.ts` for why: KV Connect isn't exposed on the new
console.deno.com platform, and `--tunnel` only reaches an isolated local dev
database, never production).

## Setup (one-time)

Set `ADMIN_TOKEN` as a secret env var on the Deno Deploy app (Settings →
Environment Variables). Without it, `/bans` returns `503`.

## List banned IPs / get the count

```bash
curl -H "X-Admin-Token: <token>" https://<site>/bans
# => {"ok":true,"count":2,"ips":["1.2.3.4","5.6.7.8"]}
```

## Release a ban

```bash
curl -X DELETE -H "X-Admin-Token: <token>" "https://<site>/bans?ip=1.2.3.4"
# => {"ok":true,"ip":"1.2.3.4"}       (404 if that IP wasn't banned)
```

## Adding more admin operations

Extend `routes/bans.ts` in place (same `checkAuth` helper, same
`ADMIN_TOKEN` header) rather than creating a new admin route — one
authenticated surface is easier to reason about than several. Route path
must avoid `utils/security.ts`'s `PROBE_PATTERNS` (no `/api/`, no
`config`-containing paths) or the probe-detect middleware will flag your own
admin requests.
