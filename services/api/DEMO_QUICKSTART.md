# Demo Access Quick Reference

**⚡ Quick commands for setting up and cleaning up demo access**

## Demo Password Setup

### Before Demo (5 minutes)

```bash
# 1. Generate and set demo password
fly secrets set DEMO_PASSWORD="$(openssl rand -base64 24)"

# 2. (Optional) Set 4-hour auto-expiration
fly secrets set DEMO_END_AT="$(date -u -v+4H +%Y-%m-%dT%H:%M:%SZ)"

# 3. Get the password to share
fly ssh console -C "echo \$DEMO_PASSWORD"
```

### After Demo (2 minutes) ⚠️ CRITICAL

```bash
# Rotate both API_KEY and remove demo password
fly secrets set API_KEY="$(openssl rand -hex 32)"
fly secrets unset DEMO_PASSWORD
fly secrets unset DEMO_END_AT  # if you set it
```

**Why rotate API_KEY?** Anyone who copied it from DevTools during the demo can still use it until you rotate it.

---

## Full Documentation

- **[DEMO_SECURITY.md](./DEMO_SECURITY.md)** - Complete demo password management guide
- **[README.md](./README.md)** - API documentation
