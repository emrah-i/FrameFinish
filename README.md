# Frame & Finish Remodeling

Residential remodeling referral site for BAIE Construction LLC. SolidJS, Vite, Tailwind 4, and build-time HTML use the EITAWARE project conventions. A Hono Worker serves static assets and the estimate API.

## Local preview

Set `googleRating` in `src/content/site.json` to the verified Google rating to show it beside hero quote buttons. With the setting left at `null`, loopback preview shows 4.9 and production omits the badge.

Use Node.js 22.13 or newer.

```sh
npm ci
npm run build:preview
npm run dev:worker
```

Open http://127.0.0.1:8787. The local preview includes sample reviews. Use synthetic data in the local form. Preview validates requests without storing or emailing them. For frontend editing, run `npm run dev` in a second terminal. Vite proxies the API to the local Worker. The production build uses `npm run build` and omits the sample reviews.

```sh
npm run check
npm test
npm run smoke:local
```

## Regression tests

After `npm ci`, install the Playwright browsers once and run the full local suite.

```sh
npx playwright install chromium firefox webkit
npm run test:all
```

The suite starts its own preview Worker on port 18787, runs the HTTP smoke checks, and tests the desktop browsers plus Android and iPhone profiles. The preview uses synthetic requests and a simulated Turnstile widget. Worker tests simulate the production provider responses. Use the launch setup below to verify the live providers.

To run a single browser test or inspect a recorded failure:

```sh
npm run test:e2e -- forms.spec.ts --project=webkit -g "contact message"
npx playwright show-trace test-results/name-of-failed-test/trace.zip
```

Playwright prints the trace and screenshot paths for each failure. The existing `npm test` command runs Vitest by itself.

## Launch setup

In Cloudflare Workers & Pages, open `frame-finish` and go to **Settings → Build**. Leave **Build command** blank and set **Deploy command** to `npm run deploy`. This script builds the static assets, runs the release checks, and deploys the `production` environment.

1. Update `src/content/site.json` with approved service categories and ZIPs. ZIPs in `partialZipCodes` go to manual review. Clear `coverageProvisional` once coverage is approved. Set the confirmed phone and address, and clear `phonePlaceholder`. Review the Privacy and Terms copy against the final operating practices.
2. Configure `RATE_LIMITER` in `wrangler.json` with an account-unique rate limit namespace. Create a managed Turnstile widget with pre-clearance off and add its public key to site content. Set its secret with `npx wrangler secret put TURNSTILE_SECRET_KEY --env production`.
3. Verify the sender domain in Resend and set the Worker secret with `npx wrangler secret put RESEND_API_KEY --env production`. Set `EMAIL_FROM` to the verified sender and `LEAD_EMAIL` to the monitored business inbox in `wrangler.json` under `env.production.vars`. Turn off open and click tracking on the sending domain. Resend sends the full submission to the business and a separate receipt to the homeowner. The app confirms the request after Resend accepts both messages. Retries reuse the same reference within Resend's 24-hour deduplication window. Use the business inbox for long-term records because Resend's dashboard history expires according to the plan.
4. To enable cookie-free page and performance metrics, add the hostname in Cloudflare Web Analytics and select manual setup. Set `FRAME_FINISH_ANALYTICS_TOKEN` to its public beacon token in the build environment and use `npm run deploy`. Local preview excludes the beacon. For search impressions and queries, verify the domain in Google Search Console and submit `/sitemap.xml` after launch.
5. Verify the canonical host, estimate messages, and analytics after deploying. Google reviews are deferred for this referral model.

## Photos and brand

The supplied WebP files are AI-generated remodeling examples. To replace them, place approved 3:2 originals named `kitchen.jpg`, `bathroom.jpg`, `basement.jpg`, and `stair.jpg` in a source folder and run `npm run photos:prepare -- /path/to/approved-source-photos` with FFmpeg installed. Update photo descriptions in `src/shared/content.ts` to match the replacements. The header and footer use `public/images/frame-finish-logo-white.png`. The dark logo is `public/images/frame-finish-logo.png`.

The estimate section uses illustrative before-and-after pairs in `public/images/remodel-*`, sized at 480 and 960 px per photo. The built-in image generator created same-angle diptychs of three fictional Ohio homes: a kitchen with cabinetry and countertop updates, a hall bathroom with new tile and vanity, and a living room with carpet replaced by oak planks. Each diptych was split into equal panels and cropped to 3:2. Use matched, approved photos and update the descriptions when replacing these examples.
