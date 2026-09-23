import { REST, Routes } from 'discord.js'
import { COMMANDS } from './commands.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN)
const result = await rest.put(Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.DISCORD_GUILD_ID), { body: COMMANDS })
console.log(`Registered ${result.length} MADGER_Bot Discord commands in guild ${config.DISCORD_GUILD_ID}.`)
