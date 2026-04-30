# tennection-web

Marketing site & legal pages for **Tennection** — a tennis practice diary & community app.

Live: <https://tennection.kxon.net>

## Pages

- `/` — Landing page (placeholder, to be expanded)
- `/privacy` — Privacy Policy (linked from App Store Connect)
- `/terms` — Terms of Service (placeholder)

## Stack

- Pure static HTML + CSS, no framework yet
- Hosted on [Vercel](https://vercel.com) with custom domain `tennection.kxon.net`
- DNS managed via GoDaddy (CNAME `tennection` → `cname.vercel-dns.com`)

## Local preview

Just open `index.html` in a browser, or:

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

## Updates

Edit the HTML/CSS files and push to `main`. Vercel auto-deploys on push.
When Privacy Policy text changes substantially, also bump the
`最後更新日期` line in `privacy.html` and notify users in-app.
