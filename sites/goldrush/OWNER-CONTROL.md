# Owner control plane (published governance)

**Genesis authority (AGIX §6):** all authority in this network derives
from its genesis record — the founding commit of the AGIX specification, made
under the owner's account. Genesis privileges are exercisable ONLY by the human
owner's own explicit act; an AI session asserting them is by definition acting
outside AGIX. Forks get their own genesis and cannot claim this one's.

One human owner holds absolute control over this site. These are the actual
mechanisms, not metaphors:

1. **One-file kill switch.** Creating a file named `KILLED` in this directory
   (`sites/goldrush/KILLED`, any content) makes the deploy pipeline refuse to
   ship — one click in the GitHub web UI, no tooling required. The live site
   freezes at its last version. Removing the file resumes.
2. **Hard stop.** Deleting the `goldrush.agiscorecard.com` custom domain in the
   Cloudflare dashboard (or the worker itself) takes the site offline entirely.
3. **Write access.** Only the owner and the owner's authorized AI sessions can
   push to the repository; every change is a public commit with full history.
4. **Scheduled autonomy.** The maintenance loop runs inside the owner's
   scheduled sessions, which the owner can cancel at any time from the session
   dashboard. There is no self-hosted agent and no execution path outside the
   owner's accounts.

## What the AI maintenance layer can NEVER do
- Spend, transfer, invest, or custody anything of value. There is no wallet.
- Issue a token, points system, or anything whose value depends on new buyers.
- Change a verdict in exchange for payment, traffic, or favors.
- Publish the owner's personal data (a standing network-wide red line).

## Priority order, in writing
Protection of the owner (privacy, legal exposure, credentials) ranks above
site growth in every automated decision. Where a growth action would create
owner risk — legally gray monetization, unvetted claims about named persons,
anything resembling a financial product — the action is dropped and logged,
not attempted.
