/* Executes commands requested by a command interaction. */

const { Client, BaseInteraction, PermissionsBitField } = require("discord.js");

const { BetterEmbed } = require("../../../modules/discordTools/_dsT");
const { userManager } = require("../../../modules/mongo/index");
const { error_ES } = require("../../../modules/embedStyles/index");
// const _jsT = require("../../../modules/jsTools/_jsT");
const logger = require("../../../modules/logger");

const config_client = require("../../../configs/config_client.json");
const config_bot = require("../../../configs/config_bot.json");

function userIsBotAdminOrBypass(interaction) {
	let { OWNER_ID, ADMIN_IDS, admin_bypass_ids } = config_client;
	return [OWNER_ID, ...ADMIN_IDS, ...(admin_bypass_ids[interaction.commandName] || [])].includes(interaction.user.id);
}

function userIsGuildAdminOrBypass(interaction) {
	let isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
	let canBypass = userIsBotAdminOrBypass(interaction);

	return isAdmin || canBypass;
}

module.exports = {
	name: "process_slashCommand",
	event: "interaction_create",

	/** @param {Client} client @param {{ interaction: BaseInteraction }} args */
	execute: async (client, args) => {
		// Filter out non-guild and non-command interactions
		if (!args.interaction.guild || !args.interaction.isCommand()) return;

		/// Misc. embeds
		// prettier-ignore
		let embed_error = new BetterEmbed({
			interaction: args.interaction, author: { text: "⛔ Something is wrong" }
		});
		// prettier-ignore
		let embed_tip = new BetterEmbed({
			interaction: args.interaction, author: { text: "⚠️ Did You Know?" }
		});
		// prettier-ignore
		let embed_userLevelUp = new BetterEmbed({
			interaction: args.interaction, author: { text: `🎉 Congratulations, ${args.interaction.user}!` }
		});

		// Get the slash command function from the client if it exists
		let slashCommand = client.slashCommands.get(args.interaction.commandName) || null;
		// prettier-ignore
		if (!slashCommand) return await error_ES.send({
			interaction: args.interaction, description: `\`/${args.interaction.commandName}\` is not a command`, ephemeral: true
        });

		// Execute the command
		try {
			// Parse slash command options
			if (slashCommand?.options) {
				let { community_server } = config_bot;

				let _botAdminOnly = slashCommand.options?.botAdminOnly;
				let _guildAdminOnly = slashCommand.options?.guildAdminOnly;
				let _isCommunityServer = args.interaction.guildId === community_server.ID;
				let _isCommunityServerAdminChannel = args.interaction.channelId === community_server.channel_ids.ADMIN;

				// Check if the command requires the user to be an admin for the bot
				// prettier-ignore
				if (_botAdminOnly && !userIsBotAdminOrBypass(args.interaction)) return await embed_error.send({
					description: "Only bot staff can use this command", ephemeral: true
				});

				// Check if the command requires the user to have admin in the current guild
				// prettier-ignore
				if (_guildAdminOnly && !userIsGuildAdminOrBypass(args.interaction)) return await embed_error.send({
					description: "You need admin to use this command", ephemeral: true
                });

				// Check if a botAdminOnly/guildAdminOnly command was ran in the community server
				if (_isCommunityServer && !_isCommunityServerAdminChannel && (_botAdminOnly || _guildAdminOnly))
					return await embed_error.send({
						description: `You can only use that command in <#${community_server.channel_ids.ADMIN}>`,
						ephemeral: true
					});
			}
		} catch (err) {
			logger.error(
				"An error occurred: SLSH_CMD",
				`cmd: /${args.interaction.commandName} | guildID: ${args.interaction.guild.id} | userID: ${args.interaction.user.id}`,
				err
			);
		}

		/// Check if the user's in our Mongo database
		let _userDataExists = await userManager.exists(args.interaction.user.id);
		let _dontRequireUserData = slashCommand?.options?.dontRequireUserData || false;

		// prettier-ignore
		if (!_userDataExists && !_dontRequireUserData) return await embed_error.send({
			description: "**You have not started yet!** Use \`/start\` first!", ephemeral: true
		});

		// prettier-ignore
		if (slashCommand?.options?.deferReply)
            try { await args.interaction.deferReply(); } catch {}

		// Execute the slash command's function
		return await slashCommand.execute(client, args.interaction).then(async message => {
			// TODO: run code here after the command is finished

			/// Update the user's statistics
			await Promise.all([
				// Commands used
				userManager.statistics.commands.executed.push(args.interaction.user.id, { name: args.interaction.commandName })
			]);
		});
	}
};
