# Dependency security update — 16 October 2026

Baseline: GitHub main `c86b7e7` (#55). The local checkout's tree matched main before these changes.

## Result

| Audit scope | Before | After |
| --- | --- | --- |
| All dependencies | 14 packages: 9 high, 5 moderate | 8 packages: 8 high |
| Production dependencies (`--omit=dev`) | 2: Axios high, ip-address moderate | **0** |

The remaining eight package entries share **one underlying advisory** in `braces`. The audit aggregates advisory severity through dependency chains; entries are not independent vulnerabilities. In the final audit the inherited entries are all classified high, including the Tailwind plugins previously classified moderate. No advisory is suppressed or excluded from the full audit.

These are dependency audit results, not proof of exploitability or a security certification. The audit results apply to this dependency update; opening a pull request does not update the deployed site.

## Updates

| Package | Previous locked version | Updated locked version |
| --- | --- | --- |
| axios | 1.19.0 | 1.20.0 |
| ip-address | 10.3.1 | 10.7.4 |
| brace-expansion | 2.1.4 and 5.0.9 | 2.1.7 and 5.0.12 |
| source-map-js | 1.2.1 | 1.2.2 |
| postcss-selector-parser | 6.0.10 and 6.1.4 | 7.1.6 |

Axios's direct minimum is raised to `^1.20.0`. Compatible transitive updates are recorded in `package-lock.json`; no unrelated dependency versions are changed.

The `postcss-selector-parser: 7.1.6` override is deliberate: Tailwind 3, postcss-nested 6 and typography 0.5 still request vulnerable parser 6 releases, so an ordinary compatible update cannot apply the security fix. Parser 7 changes insertion-during-iteration behavior. The existing application build exercises all three consumers; its output stylesheet is byte-identical to the baseline. This verifies the current project's CSS, not universal compatibility with every future selector or plugin. Remove the override when upstream consumers support a patched parser without it.

Sources:

- [Axios 1.20.0 security and compatibility notes](https://github.com/axios/axios/releases/tag/v1.20.0).
- [ip-address address-family and subnet advisory](https://github.com/advisories/GHSA-j6r3-76f7-8jcv).
- [Parser CPU-exhaustion advisory and patched 7.1.6](https://github.com/advisories/GHSA-rj75-hqrm-r3gf).
- [Parser 7.0 insertion-iteration behavior change](https://github.com/postcss/postcss-selector-parser/releases/tag/v7.0.0).
- [source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

## Remaining development findings

[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) affects `braces <=3.0.3`; the advisory lists **no patched version**, and npm's current release is still 3.0.3 at the time of this check.

Affected audit entries:

- braces;
- chokidar;
- micromatch;
- fast-glob;
- nodemon;
- tailwindcss;
- @tailwindcss/typography;
- tailwindcss-animate.

The existing build/watcher dependency chains still require braces. Do not pass attacker-controlled glob patterns or arbitrary untrusted repository content into these tools. A full Tailwind/watcher migration or a locally maintained fork would be a separate, larger change; this update does not force such a migration, downgrade nodemon to an obsolete release, or relabel an affected package as fixed.

`--omit=dev` describes npm's dependency classification. It does **not** prove those packages are absent from Replit's installation: the existing runtime imports Vite/configuration modules and the deployment installs the full dependency tree. Do not change deployment to `npm ci --omit=dev` as part of this update.

CI now runs `npm audit --omit=dev --audit-level=moderate` after installation, so newly reported moderate/high/critical production findings fail verification. The full audit remains nonzero because of the documented development advisory. Registry availability and new advisories can change future audit outcomes.

## Validation

- Clean lockfile installation: `npm ci --ignore-scripts --no-audit` passed.
- Full `npm run verify` with placeholder public client configuration: **92 test files, 680 tests passed**, TypeScript and production build passed.
- Real Axios HTTP transport against loopback fixtures only: JSON POST preserved, a 307 redirect is not followed when disabled, and a stalled endpoint times out.
- Real express-rate-limit middleware: IPv6 addresses within one /56 share a counter, neighboring subnets remain separate, and IPv4 counters remain distinct.
- Existing Zapier URL validation and application suites passed. No real Zapier messages, payments, production requests or database operations were made.
- Final stylesheet: `index-CqneS_ip.css`, 106684 bytes, SHA-256 `1df154fa0c265569f7e5e6d377e4f11720af65203a7b4a73db1033dfd8799cc0`; identical to the pre-update build.
- `git diff --check` passed.

The first sandboxed test run could not open localhost sockets (`EPERM`). Only the affected integration suites were retried with local socket permission; all 43 tests passed. The final full verification after a clean installation also passed with that permission. This was an execution restriction, not an application regression.

No merge, deployment or migration was performed for this dependency update.
