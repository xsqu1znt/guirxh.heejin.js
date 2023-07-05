// Initializes the bot and gets everything up and running.

require('dotenv').config();
const fs = require('fs');

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const slashCommandManager = require('./modules/slashCommandManager');
const logger = require('./modules/logger');
const mongo = require('./modules/mongo');

const TOKEN = process.env.TOKEN || require('./configs/clientSettings.json').TOKEN;

logger.log("initializing...");

const client = new Client({
    intents: [
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],

    partials: [Partials.Channel] // Allows the bot to access DMs
});

// Collections that hold valuable information for the client
client.slashCommands_general = new Collection();
client.slashCommands_admin = new Collection();
client.slashCommands = new Collection();
client.mongoUpdateQueue = new Collection();

// Run importers
let importers_dir = fs.readdirSync('./modules/importers').filter(fn => fn.startsWith('import_') && fn.endsWith('.js'));
importers_dir.forEach(fn => {
    try { require(`./modules/importers/${fn}`).init(client); }
    catch (err) { logger.error("Importer failed to load", `\"${fn}\" is not a valid importer`, err); }
});

// Connect the client to discord
logger.log("connecting to Discord...");
client.login(TOKEN).then(async () => {
    await mongo.connect();

    // Push all commands including admin to a specific server (use this if Heejin is using local commands) (this is local)
    // await slashCommandManager.push(client, "1107285909365329922", false, true);

    // Push only admin commands to a specific server (use this if Heejin is using global commands) (this is local)
    // await slashCommandManager.push(client, "1107285909365329922", false, true, true);

    // Push all commands excluding admin to a specific server (this is local) - use this to refresh local also
    // await slashCommandManager.push(client, "1107285909365329922");

    // Push all commands excluding admin (this is global) - use this to refresh global also
    // await slashCommandManager.push(client, null, true);

    // Remove all commands (this is local | does not work if using global commands) (this is local)
    // await slashCommandManager.remove(client, "1107285909365329922");

    // Remove all commands (this is global | does not work if using local commands) (this is global)
    // await slashCommandManager.remove(client, null, true);
});