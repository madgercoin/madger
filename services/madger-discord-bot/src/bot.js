import {
  ActionRowBuilder, AutoModerationActionType, AutoModerationRuleEventType,
  AutoModerationRuleKeywordPresetType, AutoModerationRuleTriggerType, ButtonBuilder,
  ButtonStyle, ChannelType, Client, EmbedBuilder, Events, GatewayIntentBits,
  Partials, PermissionFlagsBits
} from 'discord.js'
import { capabilityDirectory } from './commands.js'
import {
  LINKS, OFFICIAL_MINT, OFFICIAL_POOL, SlidingWindowLimiter, inspectLink,
  levelFromXp, moderationFinding, normalizeFingerprint, safeChannelName, truncate, xpForMessage
} from './core.js'
import { fetchVerifiedMarket, formatCompact, formatUsd } from './market.js'

const GOLD = 0xD7A93E
const RED = 0xB3261E
const GREEN = 0x2E7D32
const XP_LIMITER = new SlidingWindowLimiter({ limit: 1, windowMs: 60_000 })
const FLOOD_LIMITER = new SlidingWindowLimiter({ limit: 6, windowMs: 8_000 })
const JOIN_LIMITER = new SlidingWindowLimiter({ limit: 7, windowMs: 60_000 })
const fingerprints = new Map()

function baseEmbed(title, description = null) {
  const embed = new EmbedBuilder().setColor(GOLD).setTitle(title).setTimestamp().setFooter({ text: 'MADGER_Bot • Proof over promises' })
  if (description) embed.setDescription(description)
  return embed
}

function isAdmin(interaction, config) {
  return config.adminUserIds.has(interaction.user.id) || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) || interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
}

function officialButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Verify').setStyle(ButtonStyle.Link).setURL(LINKS.launch),
    new ButtonBuilder().setLabel('Buy Guide').setStyle(ButtonStyle.Link).setURL(LINKS.buy),
    new ButtonBuilder().setLabel('Chart').setStyle(ButtonStyle.Link).setURL(LINKS.chart)
  )
}

async function safeReply(interaction, payload) {
  const response = typeof payload === 'string' ? { content: payload } : payload
  if (interaction.deferred || interaction.replied) return interaction.editReply(response)
  return interaction.reply(response)
}

async function logToChannel(client, config, event, store, logger) {
  store.recordEvent(event).catch(error => logger.error({ error, eventType: event.type }, 'Failed to record event'))
  if (!config.DISCORD_MOD_LOG_CHANNEL_ID) return
  const channel = await client.channels.fetch(config.DISCORD_MOD_LOG_CHANNEL_ID).catch(() => null)
  if (!channel?.isTextBased()) return
  const description = [event.userId ? `User: <@${event.userId}>` : null, event.channelId ? `Channel: <#${event.channelId}>` : null, event.details?.reason ? `Reason: ${event.details.reason}` : null].filter(Boolean).join('\n')
  await channel.send({ embeds: [baseEmbed(`Safety event: ${event.type}`, description).setColor(event.severity === 'critical' ? RED : GOLD)] }).catch(error => logger.error({ error }, 'Failed to send moderation log'))
}

function helpPayload() {
  return { embeds: [baseEmbed('MADGER_Bot Capability Center', capabilityDirectory())], components: [officialButtons()], ephemeral: true }
}

async function marketPayload(store) {
  let market
  try { market = await fetchVerifiedMarket() } catch { market = await store.latestMarket() }
  if (!market) return { content: 'Market data is temporarily unavailable. The verified links remain available below.', components: [officialButtons()], ephemeral: true }
  return {
    embeds: [baseEmbed('$MADGER Verified Market Snapshot')
      .addFields(
        { name: 'Price', value: formatUsd(market.priceUsd ?? market.price_usd, 8), inline: true },
        { name: 'Market cap', value: formatUsd(market.marketCapUsd ?? market.market_cap_usd, 0), inline: true },
        { name: 'Liquidity', value: formatUsd(market.liquidityUsd ?? market.liquidity_usd, 0), inline: true },
        { name: '24h volume', value: formatUsd(market.volume24hUsd ?? market.volume_24h_usd, 0), inline: true },
        { name: '24h activity', value: `${formatCompact(market.buys24h ?? market.buys_24h)} buys • ${formatCompact(market.sells24h ?? market.sells_24h)} sells`, inline: true },
        { name: 'Source guard', value: 'Exact official mint and pool verified before display.', inline: false }
      )],
    components: [officialButtons()]
  }
}

async function handleMadger(interaction, store) {
  const command = interaction.options.getSubcommand()
  if (command === 'help') return safeReply(interaction, helpPayload())
  if (command === 'verify') return safeReply(interaction, { embeds: [baseEmbed('Official MADGER Verification').addFields({ name: 'Mint', value: `\`${OFFICIAL_MINT}\`` }, { name: 'Raydium CPMM pool', value: `\`${OFFICIAL_POOL}\`` }, { name: 'Rule', value: 'Compare the complete mint. Never trust a shortened address.' })], components: [officialButtons()] })
  if (command === 'buy') return safeReply(interaction, { embeds: [baseEmbed('Buy $MADGER Safely', 'Use the fixed official guide. MADGER_Bot never asks for a seed phrase, private key, verification transfer, preset slippage, or remote access.')], components: [officialButtons()], ephemeral: true })
  if (command === 'price' || command === 'pool') return safeReply(interaction, await marketPayload(store))
  if (command === 'chart') return safeReply(interaction, { content: `Verified chart: ${LINKS.chart}`, ephemeral: true })
  if (command === 'links') return safeReply(interaction, { embeds: [baseEmbed('Official MADGER Links', `[Website](${LINKS.home}) • [Verification](${LINKS.launch}) • [Official links](${LINKS.official}) • [Chart](${LINKS.chart}) • [Dashboard](${LINKS.dashboard})`)], ephemeral: true })
  if (command === 'supply') return safeReply(interaction, { embeds: [baseEmbed('Verified Supply', '**Supply:** 1,000,000,000 MADGER\n**Decimals:** 6\n**Transfer tax:** 0%\n\nUse the official verification record for current authority evidence.')], components: [officialButtons()] })
  if (command === 'holders') {
    const holders = await store.latestHolders()
    const description = holders ? `Positive-balance wallets: **${formatCompact(holders.holder_count)}**\nLargest-wallet share: **${Number(holders.largest_holder_percentage ?? 0).toFixed(2)}%**\nTop-10 concentration: **${Number(holders.top_10_percentage ?? 0).toFixed(2)}%**` : 'Holder intelligence is temporarily unavailable.'
    return safeReply(interaction, { embeds: [baseEmbed('Holder Intelligence', description)] })
  }
  if (command === 'risk') return safeReply(interaction, { embeds: [baseEmbed('Risk Inputs — Not a Safety Score', 'MADGER_Bot verifies the exact mint and pool, then reports liquidity depth, data freshness, holder count, and raw concentration. It does not predict returns or declare any token safe.')], components: [officialButtons()] })
  if (command === 'wallets') return safeReply(interaction, { embeds: [baseEmbed('Published Project Wallets', 'MADGER_Bot classifies the published liquidity reserve, treasury, community, operations, and creator-reserve wallets. Balances and movements are evidence—not proof of intent or trade direction.')], components: [officialButtons()] })
  if (command === 'locks') return safeReply(interaction, { embeds: [baseEmbed('Verified Lock Monitoring', 'Strategic-reserve locks and documented Streamflow LP escrows are monitored. Any balance decrease is privately flagged for comparison against the authorized transaction record.')], components: [officialButtons()] })
  if (command === 'status') return safeReply(interaction, { embeds: [baseEmbed('MADGER_Bot Status', 'Discord Gateway: **online**\nOfficial identity guard: **active**\nEdited-message moderation: **active**\nWallet custody/signing: **not present**')], ephemeral: true })
}

async function handleSafety(interaction, client, config, store, logger) {
  const command = interaction.options.getSubcommand()
  if (command === 'guide') return safeReply(interaction, { embeds: [baseEmbed('MADGER Safety Standard', 'Never share a seed phrase, private key, password, one-time code, or screen-control access. Verify the full mint. Treat unsolicited “support,” wallet validation, migrations, claims, and verification transfers as hostile.')], components: [officialButtons()], ephemeral: true })
  if (command === 'check-token') {
    const mint = interaction.options.getString('mint', true).trim()
    const official = mint === OFFICIAL_MINT
    return safeReply(interaction, { embeds: [baseEmbed(official ? 'Official MADGER Mint' : 'Not the Official MADGER Mint', official ? `Exact match: \`${OFFICIAL_MINT}\`` : `The supplied address does not exactly match the official mint.\n\nOfficial: \`${OFFICIAL_MINT}\``).setColor(official ? GREEN : RED)], ephemeral: true })
  }
  if (command === 'check-link') {
    const result = inspectLink(interaction.options.getString('url', true))
    return safeReply(interaction, { embeds: [baseEmbed(`Link result: ${result.level.toUpperCase()}`, `Host: **${result.host ?? 'unavailable'}**\nReason: ${result.reason}\n\nThis is a local structural check; it does not visit or certify the destination.`).setColor(result.level === 'trusted' ? GREEN : result.level === 'danger' ? RED : GOLD)], ephemeral: true })
  }
  if (command === 'report') {
    const details = interaction.options.getString('details', true)
    const messageLink = interaction.options.getString('message-link')
    await logToChannel(client, config, { guildId: interaction.guildId, userId: interaction.user.id, channelId: interaction.channelId, type: 'member_report', severity: 'high', details: { reason: truncate(details, 500), messageLink } }, store, logger)
    return safeReply(interaction, { content: 'Report recorded privately for moderator review. Do not engage with the suspected account or link.', ephemeral: true })
  }
}

async function handleCommunity(interaction, config, store) {
  const command = interaction.options.getSubcommand()
  if (command === 'profile' || command === 'rank') {
    const member = await store.member(interaction.guildId, interaction.user.id)
    const xp = Number(member?.xp ?? 0)
    return safeReply(interaction, { embeds: [baseEmbed('Your Burrow Profile').addFields({ name: 'Contribution points', value: String(member?.contribution_points ?? 0), inline: true }, { name: 'Community level', value: String(levelFromXp(xp)), inline: true }, { name: 'XP', value: String(xp), inline: true }, { name: 'Messages recognized', value: String(member?.message_count ?? 0), inline: true })], ephemeral: true })
  }
  if (command === 'leaderboard') {
    const rows = await store.leaderboard(interaction.guildId)
    const body = rows.length ? rows.map((row, index) => `${index + 1}. <@${row.user_id}> — ${row.contribution_points} contribution points • level ${levelFromXp(row.xp)}`).join('\n') : 'No ranked members yet.'
    return safeReply(interaction, { embeds: [baseEmbed('The Burrow Leaderboard', body)] })
  }
  if (command === 'missions') {
    const rows = await store.activeMissions()
    const body = rows.length ? rows.map(row => `**${row.code} — ${row.title}** (${row.points} points)\n${truncate(row.instructions, 240)}`).join('\n\n') : 'No active missions right now.'
    return safeReply(interaction, { embeds: [baseEmbed('Contributor Missions', `${body}\n\nPoints reward human-approved work—not purchases, blind engagement, or spam.`)], ephemeral: true })
  }
  if (command === 'submit') {
    const code = interaction.options.getString('code', true).toLowerCase().trim()
    const evidence = interaction.options.getString('evidence', true).trim()
    let url
    try { url = new URL(evidence) } catch { return safeReply(interaction, { content: 'Evidence must be a valid public HTTPS URL.', ephemeral: true }) }
    if (url.protocol !== 'https:') return safeReply(interaction, { content: 'Evidence must use HTTPS.', ephemeral: true })
    const row = await store.createSubmission({ guildId: interaction.guildId, userId: interaction.user.id, missionCode: code, evidenceUrl: url.href })
    return safeReply(interaction, { content: `Submission #${row.id} is queued for human review.`, ephemeral: true })
  }
  if (command === 'referral') {
    const invites = await interaction.guild.invites.fetch().catch(() => null)
    const existing = invites?.find(invite => invite.inviterId === interaction.user.id && !invite.maxUses)
    const invite = existing ?? await interaction.channel.createInvite({ maxAge: 604800, unique: true, reason: 'MADGER_Bot member referral' })
    return safeReply(interaction, { content: `Your attributable invite: ${invite.url}\nIt expires after seven days. Referrals do not reward purchases.`, ephemeral: true })
  }
  if (command === 'roles') {
    const buttons = new ActionRowBuilder()
    if (config.DISCORD_MEMBER_ROLE_ID) buttons.addComponents(new ButtonBuilder().setCustomId('role:member').setLabel('Burrow Member').setStyle(ButtonStyle.Secondary))
    if (config.DISCORD_CONTRIBUTOR_ROLE_ID) buttons.addComponents(new ButtonBuilder().setCustomId('role:contributor').setLabel('Contributor').setStyle(ButtonStyle.Secondary))
    if (!buttons.components.length) return safeReply(interaction, { content: 'Optional roles have not been configured yet.', ephemeral: true })
    return safeReply(interaction, { content: 'Choose or remove an opt-in role:', components: [buttons], ephemeral: true })
  }
  if (command === 'suggest') return safeReply(interaction, { embeds: [baseEmbed('Community Suggestion', truncate(interaction.options.getString('idea', true), 1000)).setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })] })
  if (command === 'poll') {
    const question = interaction.options.getString('question', true)
    const choices = interaction.options.getString('choices', true).split('|').map(value => value.trim()).filter(Boolean).slice(0, 5)
    if (choices.length < 2) return safeReply(interaction, { content: 'Provide two to five choices separated by `|`.', ephemeral: true })
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣']
    await safeReply(interaction, { embeds: [baseEmbed(question, choices.map((choice, i) => `${emojis[i]} ${truncate(choice, 120)}`).join('\n'))] })
    const message = await interaction.fetchReply()
    for (let i = 0; i < choices.length; i++) await message.react(emojis[i])
  }
}

async function handleSupport(interaction, config, store) {
  const command = interaction.options.getSubcommand()
  if (command === 'faq') return safeReply(interaction, { embeds: [baseEmbed('MADGER FAQ', `For verified answers, use ${LINKS.official} and ${LINKS.launch}. If your question is unresolved, open a private ticket.\n\nQuestion received: ${truncate(interaction.options.getString('question', true), 300)}`)], ephemeral: true })
  if (command === 'ticket') {
    if (!config.FEATURE_TICKETS) return safeReply(interaction, { content: 'Tickets are currently disabled.', ephemeral: true })
    const topic = truncate(interaction.options.getString('topic', true), 200)
    const guild = interaction.guild
    const channel = await guild.channels.create({
      name: `ticket-${safeChannelName(interaction.user.username)}`,
      type: ChannelType.GuildText,
      parent: config.DISCORD_SUPPORT_CATEGORY_ID || undefined,
      topic: `MADGER support ticket for ${interaction.user.id}: ${topic}`,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] }
      ]
    })
    await store.createTicket({ guildId: guild.id, channelId: channel.id, ownerUserId: interaction.user.id, topic })
    await channel.send({ content: `<@${interaction.user.id}>`, embeds: [baseEmbed('Private MADGER Support Ticket', `${topic}\n\nNever share a seed phrase, private key, password, or one-time code—even here.`)] })
    return safeReply(interaction, { content: `Private ticket created: ${channel}`, ephemeral: true })
  }
  if (command === 'close') {
    const ticket = await store.ticket(interaction.channelId)
    if (!ticket || (String(ticket.owner_user_id) !== interaction.user.id && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels))) return safeReply(interaction, { content: 'This channel is not your open support ticket.', ephemeral: true })
    await store.closeTicket(interaction.channelId, interaction.user.id)
    await safeReply(interaction, { content: 'Ticket closed. This channel will be removed in 10 seconds.' })
    setTimeout(() => interaction.channel.delete('MADGER support ticket closed').catch(() => {}), 10_000)
  }
}

async function syncAutoMod(guild, config) {
  const existing = await guild.autoModerationRules.fetch()
  const desired = [
    {
      name: 'MADGER — credential theft guard', eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.Keyword,
      triggerMetadata: { keywordFilter: ['*seed phrase*', '*recovery phrase*', '*private key*', '*wallet validation*', '*verify your wallet*'] },
      actions: [{ type: AutoModerationActionType.BlockMessage, metadata: { customMessage: 'Blocked by MADGER safety controls. Never request wallet credentials.' } }],
      enabled: true, reason: 'MADGER_Bot safety baseline'
    },
    {
      name: 'MADGER — harmful language preset', eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.KeywordPreset,
      triggerMetadata: { presets: [AutoModerationRuleKeywordPresetType.Profanity, AutoModerationRuleKeywordPresetType.SexualContent, AutoModerationRuleKeywordPresetType.Slurs] },
      actions: [{ type: AutoModerationActionType.BlockMessage, metadata: { customMessage: 'This message violates The Burrow community standard.' } }],
      enabled: true, reason: 'MADGER_Bot community baseline'
    },
    {
      name: 'MADGER — mention spam guard', eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.MentionSpam,
      triggerMetadata: { mentionTotalLimit: 5, mentionRaidProtectionEnabled: true },
      actions: [{ type: AutoModerationActionType.BlockMessage, metadata: { customMessage: 'Mass mentions are blocked.' } }],
      enabled: true, reason: 'MADGER_Bot anti-raid baseline'
    }
  ]
  const results = []
  for (const rule of desired) {
    const found = existing.find(item => item.name === rule.name)
    results.push(found ? await found.edit(rule) : await guild.autoModerationRules.create(rule))
  }
  return results
}

async function handleAdmin(interaction, client, config, store, logger) {
  if (!isAdmin(interaction, config)) return safeReply(interaction, { content: 'This command requires MADGER administrator authorization.', ephemeral: true })
  const command = interaction.options.getSubcommand()
  if (command === 'health' || command === 'dashboard') {
    const db = await store.health().catch(error => ({ ok: false, error: error.message }))
    const me = interaction.guild.members.me
    const permissions = me.permissions.toArray().sort()
    return safeReply(interaction, { embeds: [baseEmbed(command === 'health' ? 'MADGER_Bot Health' : 'MADGER Command Center').addFields({ name: 'Gateway', value: `${client.ws.ping} ms`, inline: true }, { name: 'Database', value: db.ok ? `${db.latencyMs} ms` : 'unavailable', inline: true }, { name: 'Guilds', value: String(client.guilds.cache.size), inline: true }, { name: 'Active permissions', value: truncate(permissions.join(', '), 1000) })], ephemeral: true })
  }
  if (command === 'setup') {
    const me = interaction.guild.members.me
    const required = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ViewAuditLog, PermissionFlagsBits.ManageGuildExpressions, PermissionFlagsBits.CreateInstantInvite]
    const missing = required.filter(permission => !me.permissions.has(permission)).map(permission => String(permission))
    return safeReply(interaction, { embeds: [baseEmbed('Server Setup Audit', missing.length ? `Missing ${missing.length} required permission flag(s):\n\`${missing.join(', ')}\`` : 'All required least-privilege permissions are present. Administrator permission is not required.')], ephemeral: true })
  }
  if (command === 'sync-automod') {
    if (!config.FEATURE_AUTOMOD_SYNC) return safeReply(interaction, { content: 'Native AutoMod synchronization is disabled.', ephemeral: true })
    const rules = await syncAutoMod(interaction.guild, config)
    return safeReply(interaction, { content: `Synchronized ${rules.length} native AutoMod rules.`, ephemeral: true })
  }
  if (command === 'announce') {
    const channel = await client.channels.fetch(config.DISCORD_ANNOUNCEMENT_CHANNEL_ID || interaction.channelId)
    const message = truncate(interaction.options.getString('message', true), 1800)
    const urlValue = interaction.options.getString('url')
    const components = []
    if (urlValue) {
      const checked = inspectLink(urlValue)
      if (checked.level !== 'trusted') return safeReply(interaction, { content: `Announcement link rejected: ${checked.reason}.`, ephemeral: true })
      components.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Open official link').setStyle(ButtonStyle.Link).setURL(urlValue)))
    }
    await channel.send({ embeds: [baseEmbed('Official MADGER Announcement', message)], components })
    return safeReply(interaction, { content: `Announcement published in ${channel}.`, ephemeral: true })
  }
  if (command === 'raid') {
    const mode = interaction.options.getString('mode', true).toLowerCase()
    if (!['status', 'on', 'off'].includes(mode)) return safeReply(interaction, { content: 'Mode must be `status`, `on`, or `off`.', ephemeral: true })
    if (mode === 'status') {
      const setting = await store.getSetting(interaction.guildId, 'raid_shield')
      return safeReply(interaction, { content: `Raid Shield: **${setting?.active && Date.parse(setting.until) > Date.now() ? 'active' : 'inactive'}**`, ephemeral: true })
    }
    const minutes = interaction.options.getInteger('minutes') ?? 30
    await store.setSetting(interaction.guildId, 'raid_shield', { active: mode === 'on', until: mode === 'on' ? new Date(Date.now() + minutes * 60_000).toISOString() : null, changedBy: interaction.user.id })
    return safeReply(interaction, { content: `Raid Shield ${mode === 'on' ? `enabled for ${minutes} minutes` : 'disabled'}.`, ephemeral: true })
  }
  if (['warn', 'timeout', 'kick', 'ban'].includes(command)) {
    const user = interaction.options.getUser('member', true)
    const member = await interaction.guild.members.fetch(user.id)
    const reason = truncate(interaction.options.getString('reason', true), 400)
    if (command === 'warn') await user.send(`MADGER Community warning: ${reason}`).catch(() => {})
    if (command === 'timeout') await member.timeout(interaction.options.getInteger('minutes', true) * 60_000, reason)
    if (command === 'kick') await member.kick(reason)
    if (command === 'ban') await member.ban({ reason, deleteMessageSeconds: 86400 })
    await logToChannel(client, config, { guildId: interaction.guildId, userId: user.id, channelId: interaction.channelId, type: `manual_${command}`, severity: command === 'ban' ? 'critical' : 'high', details: { reason, moderator: interaction.user.id } }, store, logger)
    return safeReply(interaction, { content: `${command} completed for ${user.tag}.`, ephemeral: true })
  }
  if (command === 'purge') {
    const count = interaction.options.getInteger('count', true)
    const deleted = await interaction.channel.bulkDelete(count, true)
    return safeReply(interaction, { content: `Removed ${deleted.size} recent message(s). Messages older than 14 days are not bulk-deleted.`, ephemeral: true })
  }
  if (command === 'slowmode') {
    await interaction.channel.setRateLimitPerUser(interaction.options.getInteger('seconds', true), `Changed by ${interaction.user.tag}`)
    return safeReply(interaction, { content: 'Slow mode updated.', ephemeral: true })
  }
  if (command === 'lock' || command === 'unlock') {
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: command === 'unlock' ? null : false }, { reason: `${command} by ${interaction.user.tag}` })
    return safeReply(interaction, { content: `Channel ${command === 'lock' ? 'locked' : 'unlocked'}.`, ephemeral: true })
  }
  if (command === 'reviews') {
    const rows = await store.pendingSubmissions(interaction.guildId)
    return safeReply(interaction, { embeds: [baseEmbed('Pending Contribution Reviews', rows.length ? rows.map(row => `#${row.id} • <@${row.user_id}> • **${row.mission_code}**\n${row.evidence_url}`).join('\n\n') : 'No pending submissions.')], ephemeral: true })
  }
  if (command === 'approve' || command === 'reject') {
    const result = await store.reviewSubmission({ id: interaction.options.getInteger('id', true), status: command === 'approve' ? 'approved' : 'rejected', reviewerUserId: interaction.user.id, note: interaction.options.getString('note') })
    return safeReply(interaction, { content: `Submission #${result.id} ${result.status}.`, ephemeral: true })
  }
  if (command === 'export') {
    const rows = await store.pendingSubmissions(interaction.guildId, 100)
    return safeReply(interaction, { content: `Operational export summary: ${rows.length} pending submission(s). Detailed exports remain bounded and private.`, ephemeral: true })
  }
}

async function handleMessage(message, client, config, store, logger, edited = false) {
  if (!message.guild || message.author?.bot || !message.content) return
  const member = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null)
  if (!member) return
  const administrator = config.adminUserIds.has(message.author.id) || member.permissions.has(PermissionFlagsBits.ManageMessages)
  const raid = await store.getSetting(message.guild.id, 'raid_shield').catch(() => null)
  const finding = moderationFinding(message.content, { strictLinks: Boolean(raid?.active && Date.parse(raid.until) > Date.now() && !administrator) })
  const flood = FLOOD_LIMITER.hit(`${message.guild.id}:${message.author.id}`)
  const fingerprint = normalizeFingerprint(message.content)
  const previous = fingerprints.get(`${message.guild.id}:${message.author.id}`) ?? []
  const repeated = fingerprint.length >= 12 && previous.filter(item => item.fingerprint === fingerprint && Date.now() - item.at < 60_000).length >= 2
  fingerprints.set(`${message.guild.id}:${message.author.id}`, [...previous.filter(item => Date.now() - item.at < 60_000), { fingerprint, at: Date.now() }].slice(-8))

  if (!administrator && (finding || flood.blocked || repeated)) {
    const reason = finding?.reason ?? (flood.blocked ? 'message flood' : 'repeated-message spam')
    await message.delete().catch(() => {})
    if (finding?.severity === 'critical' || flood.count >= 10) await member.timeout(10 * 60_000, `MADGER_Bot: ${reason}`).catch(() => {})
    await logToChannel(client, config, { guildId: message.guild.id, userId: message.author.id, channelId: message.channelId, messageId: message.id, type: edited ? 'edited_message_blocked' : 'message_blocked', severity: finding?.severity ?? 'medium', details: { reason } }, store, logger)
    return
  }

  if (config.FEATURE_LEVELING && !XP_LIMITER.hit(`${message.guild.id}:${message.author.id}`).blocked) {
    const amount = xpForMessage({ content: message.content, hasAttachment: message.attachments.size > 0, isThread: message.channel.isThread() })
    if (amount) await store.addXp({ guildId: message.guild.id, userId: message.author.id, username: message.author.username, amount }).catch(error => logger.error({ error }, 'XP update failed'))
  }
}

async function handleMemberAdd(member, client, config, store, logger) {
  await store.upsertMember({ guildId: member.guild.id, userId: member.id, username: member.user.username, joinedAt: new Date().toISOString() })
  const join = JOIN_LIMITER.hit(member.guild.id)
  if (join.blocked) {
    await store.setSetting(member.guild.id, 'raid_shield', { active: true, until: new Date(Date.now() + 30 * 60_000).toISOString(), trigger: 'join_velocity' })
    await logToChannel(client, config, { guildId: member.guild.id, userId: member.id, type: 'raid_shield_auto_enabled', severity: 'critical', details: { reason: `${join.count} joins inside 60 seconds` } }, store, logger)
  }
  if (config.DISCORD_QUARANTINE_ROLE_ID) await member.roles.add(config.DISCORD_QUARANTINE_ROLE_ID, 'Pending MADGER_Bot verification').catch(() => {})
  if (!config.FEATURE_WELCOME || !config.DISCORD_WELCOME_CHANNEL_ID) return
  const channel = await client.channels.fetch(config.DISCORD_WELCOME_CHANNEL_ID).catch(() => null)
  if (!channel?.isTextBased()) return
  const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`verify:${member.id}`).setLabel('Verify I am human').setStyle(ButtonStyle.Success), new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(LINKS.launch).setLabel('Verify MADGER'))
  await channel.send({ content: `<@${member.id}>`, embeds: [baseEmbed('Welcome to The Burrow', 'Verify once to unlock the community. MADGER_Bot will never ask for wallet credentials, payment, or a verification transfer.')], components: [row] })
}

async function handleButton(interaction, config, store) {
  if (interaction.customId.startsWith('verify:')) {
    if (interaction.customId.split(':')[1] !== interaction.user.id) return safeReply(interaction, { content: 'That verification button belongs to another member.', ephemeral: true })
    if (config.DISCORD_QUARANTINE_ROLE_ID) await interaction.member.roles.remove(config.DISCORD_QUARANTINE_ROLE_ID, 'MADGER_Bot verification passed').catch(() => {})
    if (config.DISCORD_VERIFIED_ROLE_ID) await interaction.member.roles.add(config.DISCORD_VERIFIED_ROLE_ID, 'MADGER_Bot verification passed')
    await store.upsertMember({ guildId: interaction.guildId, userId: interaction.user.id, username: interaction.user.username })
    return safeReply(interaction, { content: 'Verified. Welcome to The Burrow.', ephemeral: true })
  }
  if (interaction.customId.startsWith('role:')) {
    const roleId = interaction.customId === 'role:member' ? config.DISCORD_MEMBER_ROLE_ID : config.DISCORD_CONTRIBUTOR_ROLE_ID
    if (!roleId) return safeReply(interaction, { content: 'That role is not configured.', ephemeral: true })
    const hasRole = interaction.member.roles.cache.has(roleId)
    if (hasRole) await interaction.member.roles.remove(roleId, 'Self-service role removal')
    else await interaction.member.roles.add(roleId, 'Self-service role selection')
    return safeReply(interaction, { content: `Role ${hasRole ? 'removed' : 'added'}.`, ephemeral: true })
  }
}

export function createBot({ config, store, logger }) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User, Partials.GuildMember],
    allowedMentions: { parse: [], repliedUser: false },
    failIfNotExists: false
  })

  client.once(Events.ClientReady, ready => logger.info({ user: ready.user.tag, guilds: ready.guilds.cache.size }, 'MADGER_Bot Discord transport ready'))
  client.on(Events.Error, error => logger.error({ error }, 'Discord client error'))
  client.on(Events.Warn, warning => logger.warn({ warning }, 'Discord client warning'))
  client.on(Events.MessageCreate, message => handleMessage(message, client, config, store, logger).catch(error => logger.error({ error }, 'Message handler failed')))
  client.on(Events.MessageUpdate, (_old, message) => handleMessage(message, client, config, store, logger, true).catch(error => logger.error({ error }, 'Edited-message handler failed')))
  client.on(Events.GuildMemberAdd, member => handleMemberAdd(member, client, config, store, logger).catch(error => logger.error({ error }, 'Member onboarding failed')))
  client.on(Events.InteractionCreate, async interaction => {
    try {
      if (interaction.isButton()) return await handleButton(interaction, config, store)
      if (interaction.isMessageContextMenuCommand()) {
        await logToChannel(client, config, { guildId: interaction.guildId, userId: interaction.targetMessage.author.id, channelId: interaction.channelId, messageId: interaction.targetMessage.id, type: 'context_message_report', severity: 'high', details: { reason: 'Reported through message context menu', reporter: interaction.user.id } }, store, logger)
        return safeReply(interaction, { content: 'Message reported privately for moderator review.', ephemeral: true })
      }
      if (interaction.isUserContextMenuCommand()) {
        const row = await store.member(interaction.guildId, interaction.targetUser.id)
        return safeReply(interaction, { embeds: [baseEmbed('Member Safety Review', `Member: <@${interaction.targetUser.id}>\nWarnings recorded: **${row?.warning_count ?? 0}**\nMessages recognized: **${row?.message_count ?? 0}**\n\nThis summary does not infer identity or guilt.`)], ephemeral: true })
      }
      if (!interaction.isChatInputCommand()) return
      if (!interaction.inGuild()) return safeReply(interaction, { content: 'Use this command inside the official MADGER Community server.', ephemeral: true })
      if (interaction.commandName === 'madger') return await handleMadger(interaction, store)
      if (interaction.commandName === 'safety') return await handleSafety(interaction, client, config, store, logger)
      if (interaction.commandName === 'community') return await handleCommunity(interaction, config, store)
      if (interaction.commandName === 'support') return await handleSupport(interaction, config, store)
      if (interaction.commandName === 'admin') return await handleAdmin(interaction, client, config, store, logger)
    } catch (error) {
      logger.error({ error, command: interaction.commandName, userId: interaction.user?.id }, 'Interaction failed')
      await safeReply(interaction, { content: 'MADGER_Bot could not complete that request. The failure was logged without exposing credentials.', ephemeral: true }).catch(() => {})
    }
  })

  return client
}
