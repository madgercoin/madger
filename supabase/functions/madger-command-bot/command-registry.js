export const BOT_VERSION = '4.4.0'

const definitions = {
  buy: 'Open verified MADGER purchase routes',
  price: 'Latest MADGER market snapshot',
  verify: 'Verify the official mint and pool',
  tokencheck: 'Verify any token mint against MADGER',
  checktx: 'Classify a Solana transaction safely',
  walletcheck: 'Privately inspect a public Solana address',
  status: 'Public MADGERbot service health',
  app: 'Open the visual MADGER dashboard',
  alerts: 'Manage your private alerts',
  safety: 'Read the official wallet safety standard',
  report: 'Reply to suspicious content to report it',
  help: 'Show MADGERbot commands',
  pool: 'Official pool liquidity and activity',
  risk: 'Verified MADGER risk snapshot',
  supply: 'Live on-chain supply and authority audit',
  holders: 'On-chain MADGER holder intelligence',
  wallets: 'Live published project-wallet balances',
  distribution: 'Classified MADGER distribution',
  locks: 'Verified reserve and LP lock balances',
  chart: 'Open the verified live chart',
  checklink: 'Inspect a link without opening it',
  alert: 'Create a private market alert',
  alertoff: 'Disable one private alert',
  links: 'Open verified MADGER links',
  missions: 'View active contributor missions',
  submit: 'Submit mission evidence',
  mywork: 'View your private submission history',
  rank: 'View contribution points and rank',
  leaderboard: 'Top approved MADGER contributors',
  referral: 'Create your attributable invite link',
  teams: 'Join or leave MADGER promotion teams',
  jointeam: 'Join raid or outreach alerts privately',
  leaveteam: 'Leave raid or outreach alerts',
  rules: 'Read The Burrow community rules',
  whoami: 'Display your numeric Telegram ID',
  chatid: 'Display the current chat ID',
  dashboard: 'Admin command-center dashboard',
  health: 'Admin system health console',
  rpcstatus: 'Admin RPC failover diagnostics',
  buystats: 'Admin verified-buy delivery performance',
  retrycards: 'Admin retry failed buy cards',
  daily: 'Admin daily operations briefing',
  holderintel: 'Admin holder concentration console',
  modlog: 'Admin recent safety activity',
  raidmode: 'Admin Raid Shield controls',
  teamalert: 'Admin promotion-team alert',
  cleanup: 'Admin remove an obsolete message',
  purgeunverified: 'Admin removal of pending joins',
  faqmode: 'Admin FAQ responder controls',
  announce: 'Admin official Burrow announcement',
  announcepin: 'Admin announcement with pin request',
  teamstats: 'Admin promotion-team counts',
  missionadd: 'Admin create contributor mission',
  missionclose: 'Admin close contributor mission',
  missionopen: 'Admin reactivate contributor mission',
  missionlist: 'Admin view all mission statuses',
  reviews: 'Admin pending submission queue',
  stats: 'Admin seven-day bot report',
  buypreview: 'Admin preview of the branded buy card',
  sellstats: 'Admin private verified-flow report',
  approve: 'Admin approve a contribution',
  reject: 'Admin reject a contribution',
  warn: 'Admin reply-based warning',
  mute: 'Admin reply-based temporary mute',
  ban: 'Admin reply-based removal',
  unmute: 'Admin restore a muted member',
  clearwarns: 'Admin reset member warning counters',
  memberinfo: 'Admin inspect a member privately'
}

export const COMMAND_DEFINITIONS = Object.freeze(definitions)

export const COMMAND_ALIASES = Object.freeze({
  ca: 'verify',
  contract: 'verify',
  mint: 'verify',
  liquidity: 'pool',
  flow: 'sellstats'
})

export const PUBLIC_MENU_NAMES = Object.freeze([
  'buy', 'price', 'verify', 'tokencheck', 'checktx', 'walletcheck',
  'status', 'app', 'alerts', 'safety', 'report', 'help'
])

export const ADMIN_MENU_NAMES = Object.freeze([
  'dashboard', 'health', 'rpcstatus', 'buystats', 'retrycards',
  'daily', 'holderintel', 'modlog', 'raidmode', 'teamalert',
  'cleanup', 'buy', 'price', 'verify', 'status'
])

const HELP_SECTIONS = Object.freeze([
  ['Essentials', ['buy', 'price', 'verify', 'status', 'app']],
  ['Safety checks', ['tokencheck', 'checktx', 'checklink', 'walletcheck', 'safety', 'report']],
  ['Market intelligence', ['pool', 'risk', 'supply', 'holders', 'wallets', 'distribution', 'locks', 'chart', 'alert', 'alerts', 'alertoff']],
  ['Community', ['links', 'rules', 'teams', 'jointeam', 'leaveteam']],
  ['Contribute', ['missions', 'submit', 'mywork', 'rank', 'leaderboard', 'referral']]
])

export function normalizeTelegramCommand(raw) {
  const value = String(raw ?? '').trim().toLowerCase().split('@')[0].replace(/^\//, '')
  const canonical = COMMAND_ALIASES[value] ?? value
  return canonical ? '/' + canonical : ''
}

export function commandsForMenu(admin = false) {
  const names = admin ? ADMIN_MENU_NAMES : PUBLIC_MENU_NAMES
  return names.map(command => ({ command, description: definitions[command] }))
}

export function helpText(expanded = false) {
  const sections = expanded ? HELP_SECTIONS : HELP_SECTIONS.slice(0, 2)
  const body = sections.map(([title, commands]) =>
    '<b>' + title + '</b>\n' + commands.map(command => '/' + command).join(' · ')
  ).join('\n\n')
  const more = expanded ? '' : '\n\nUse <code>/help all</code> for market, community, and contributor tools.'
  return '<b>MADGERBOT COMMANDS</b> 🦡\n\n' + body + more +
    '\n\nAll existing advanced commands remain available. MADGERbot never requests wallet credentials, payments, verification transfers, or remote access.'
}

export function unknownCommandText() {
  return 'Core commands: ' + PUBLIC_MENU_NAMES.map(command => '/' + command).join(' · ') +
    '\n\nUse /help all for every advanced tool.'
}
