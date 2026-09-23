const string = (name, description, required = false) => ({ type: 3, name, description, required })
const user = (name, description, required = false) => ({ type: 6, name, description, required })
const integer = (name, description, required = false, min_value, max_value) => ({ type: 4, name, description, required, min_value, max_value })
const sub = (name, description, options = []) => ({ type: 1, name, description, options })

export const COMMANDS = Object.freeze([
  {
    name: 'madger', description: 'Verified MADGER information and market intelligence', type: 1,
    options: [
      sub('help', 'Show the complete MADGER_Bot capability directory'),
      sub('verify', 'Show the exact official mint and pool'),
      sub('buy', 'Open neutral verified purchase routes'),
      sub('price', 'Show the latest verified market snapshot'),
      sub('pool', 'Show official-pool liquidity and activity'),
      sub('risk', 'Show measurable token and pool risk inputs'),
      sub('holders', 'Show aggregate holder and concentration intelligence'),
      sub('supply', 'Show official supply and authority information'),
      sub('wallets', 'Show published project-wallet classifications'),
      sub('locks', 'Show reserve and LP lock evidence'),
      sub('chart', 'Open the verified official-pool chart'),
      sub('links', 'Show official MADGER links'),
      sub('status', 'Show public service health')
    ]
  },
  {
    name: 'safety', description: 'MADGER safety and verification tools', type: 1,
    options: [
      sub('guide', 'Read the wallet and impersonation safety standard'),
      sub('check-link', 'Inspect a URL without visiting it', [string('url', 'HTTPS URL to inspect', true)]),
      sub('check-token', 'Compare a mint with the official MADGER mint', [string('mint', 'Solana token mint', true)]),
      sub('report', 'Report suspicious content to moderators', [string('details', 'What happened and where', true), string('message-link', 'Discord message link, if available')])
    ]
  },
  {
    name: 'community', description: 'The Burrow community, contribution, and recognition tools', type: 1,
    options: [
      sub('profile', 'View your private community profile'),
      sub('rank', 'View your contribution rank and level'),
      sub('leaderboard', 'View top contributors ranked by approved work'),
      sub('missions', 'View active contributor missions'),
      sub('submit', 'Submit mission evidence for human review', [string('code', 'Mission code', true), string('evidence', 'Public evidence URL', true)]),
      sub('referral', 'Create your attributable Discord invite'),
      sub('roles', 'Open the opt-in role selector'),
      sub('suggest', 'Submit a suggestion for community review', [string('idea', 'Your specific suggestion', true)]),
      sub('poll', 'Create a community poll', [string('question', 'Poll question', true), string('choices', 'Two to five choices separated by |', true)])
    ]
  },
  {
    name: 'support', description: 'Private help and support tools', type: 1,
    options: [
      sub('ticket', 'Open a private support ticket', [string('topic', 'Short description of the issue', true)]),
      sub('close', 'Close the current support ticket'),
      sub('faq', 'Search the official MADGER FAQ', [string('question', 'Your question', true)])
    ]
  },
  {
    name: 'admin', description: 'MADGER_Bot administration and operations', type: 1,
    dm_permission: false,
    options: [
      sub('dashboard', 'Open the command center'),
      sub('health', 'Run service and permission diagnostics'),
      sub('setup', 'Audit and configure the server safely'),
      sub('sync-automod', 'Create or repair native Discord AutoMod rules'),
      sub('announce', 'Publish an official announcement', [string('message', 'Announcement text', true), string('url', 'Optional official HTTPS link')]),
      sub('raid', 'Control Raid Shield', [string('mode', 'status, on, or off', true), integer('minutes', 'Duration from 5 to 180 minutes', false, 5, 180)]),
      sub('warn', 'Warn a member with an auditable reason', [user('member', 'Member to warn', true), string('reason', 'Reason', true)]),
      sub('timeout', 'Temporarily restrict a member', [user('member', 'Member to restrict', true), integer('minutes', 'Duration in minutes', true, 1, 40320), string('reason', 'Reason', true)]),
      sub('kick', 'Remove a member from the server', [user('member', 'Member to remove', true), string('reason', 'Reason', true)]),
      sub('ban', 'Ban a member from the server', [user('member', 'Member to ban', true), string('reason', 'Reason', true)]),
      sub('purge', 'Delete a bounded number of recent messages', [integer('count', 'Messages to delete (1–100)', true, 1, 100)]),
      sub('slowmode', 'Set channel slow mode', [integer('seconds', 'Delay from 0 to 21600 seconds', true, 0, 21600)]),
      sub('lock', 'Lock the current channel'),
      sub('unlock', 'Unlock the current channel'),
      sub('reviews', 'View pending contribution submissions'),
      sub('approve', 'Approve a contribution submission', [integer('id', 'Submission ID', true, 1), string('note', 'Optional review note')]),
      sub('reject', 'Reject a contribution submission', [integer('id', 'Submission ID', true, 1), string('note', 'Optional review note')]),
      sub('export', 'Export a bounded operational report')
    ]
  },
  { name: 'Report to MADGER_Bot', type: 3 },
  { name: 'MADGER member safety review', type: 2 }
])

export function capabilityDirectory() {
  return [
    '**Verification & market** — exact mint/pool, buy routes, price, liquidity, risk inputs, holders, supply, locks, charts, project wallets.',
    '**Safety & moderation** — edited-message scanning, fake-contract detection, scam-link analysis, anti-flood, duplicate spam, join raids, impersonation, reports, warnings, timeouts, kick/ban, purge, slow mode, channel locks, native AutoMod sync.',
    '**Community** — onboarding, verification, opt-in roles, contribution missions, human-reviewed points, ranks, leveling, leaderboards, referrals, suggestions, polls, starboard, scheduled events and announcements.',
    '**Support & operations** — private tickets, FAQ, audit logs, command center, health checks, permission diagnostics, configuration, bounded exports, graceful shutdown and self-monitoring.',
    '**Cross-platform integrity** — one official mint, shared Supabase records, compatible market snapshots, and no wallet custody, seed phrases, transaction signing, fake volume, or purchase rewards.'
  ].join('\n\n')
}
