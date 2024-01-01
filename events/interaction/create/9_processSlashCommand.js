/** @file Execute commands requested by a command interaction @author xsqu1znt */

const { Client, PermissionsBitField, BaseInteraction } = require("discord.js");
const { userManager, questManager } = require("../../../modules/mongo");
const { BetterEmbed } = require("../../../modules/discordTools");
const logger = require("../../../modules/logger");

const config = {
	client: require("../../../configs/config_client.json"),
	bot: require("../../../configs/config_bot.json")
};

function userIsBotAdminOrBypass(interaction) {
	return [
		config.client.OWNER_ID,
		...config.client.ADMIN_IDS,
		...(config.client.admin_bypass_ids[interaction.commandName] || [])
	].includes(interaction.user.id);
}

function userIsGuildAdminOrBypass(interaction) {
	let isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
	let canBypass = userIsBotAdminOrBypass(interaction);

	return isAdmin || canBypass;
}

module.exports = {
	name: "processSlashCommand",
	event: "interaction_create",

	/** @param {Client} client @param {{interaction:BaseInteraction}} args */
	execute: async (client, args) => {
		// prettier-ignore
		// Filter out DM interactions
		if (!args.interaction.guildId) return args.interaction.reply({
			content: "You cannot use commands in DMs, silly!", ephemeral: true
		});

		// Filter out non-guild and non-command interactions
		if (!args.interaction.guild || !args.interaction.isCommand()) return;

		/* - - - - - { Misc. Embeds } - - - - - */
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

		/* - - - - - { Parse Prefix Command } - - - - - */
		try {
			// Check for command options
			if (slashCommand?.options) {
				let { community_server } = config.bot;

				let _botAdminOnly = slashCommand.options?.botAdminOnly;
				let _guildAdminOnly = slashCommand.options?.guildAdminOnly;
				let _isCommunityServer = args.interaction.guildId === community_server.ID;
				let _isCommunityServerAdminChannel = args.interaction.channelId === community_server.channel_ids.ADMIN;

				// prettier-ignore
				// Check if the command requires the user to be an admin for the bot
				if (_botAdminOnly && !userIsBotAdminOrBypass(args.interaction)) return await args.interaction.reply({
					content: "Only admins of this bot can use that command.", ephemeral: true
				});

				// prettier-ignore
				// Check if the command requires the user to have admin in the current guild
				if (_guildAdminOnly && !userIsGuildAdminOrBypass(args.interaction)) return await args.interaction.reply({
					content: "You need admin to use that command.", ephemeral: true
				});

				// Check if a botAdminOnly/guildAdminOnly command was ran in the community server
				if (_isCommunityServer && !_isCommunityServerAdminChannel && (_botAdminOnly || _guildAdminOnly))
					return await embed_error.send({
						description: `You can only use that command in <#${community_server.channel_ids.ADMIN}>`,
						ephemeral: true
					});

				// prettier-ignore
				if (slashCommand.options?.deferReply)
					await args.interaction.deferReply().catch(() => null);
			}

			/* - - - - - { Execute } - - - - - */
			/// Check if the user's in our Mongo database
			let _userDataExists = await userManager.exists(args.interaction.user.id);
			let _dontRequireUserData = slashCommand?.options?.dontRequireUserData || false;

			// prettier-ignore
			if (!_userDataExists && !_dontRequireUserData) return await embed_error.send({
				description: "**You have not started yet!** Use \`/start\` first!"
			});

			// prettier-ignore
			return await slashCommand.execute(client, args.interaction).then(async message => {
				// TODO: run code here after the command is finished

				// Increment commands used
				userManager.statistics.commands.executed.increment(args.interaction.user.id);

				// Trigger quest progress update
				questManager.updateQuestProgress(args.interaction.user).then(async userQuestProgress => {
					if (!userQuestProgress) return;
					
					/* - - - - - { Completed Quest Objectives } - - - - - */
					if (!userQuestProgress.newObjectivesComplete.length) return;

					/// Check if there were multiple objectives complete
					let multipleObjectivesComplete = userQuestProgress.newObjectivesComplete.length > 1;
					if (!multipleObjectivesComplete) userQuestProgress.newObjectivesComplete.forEach(q =>
						multipleObjectivesComplete = q.objectives.length > 1 ? true : false
					);

					// Create the embed :: { COMPLETED QUEST OBJECTIVES }
					let embed_completedObjectives = new BetterEmbed({
						interaction: args.interaction,
						author: `📜 Good job! ${args.interaction.member.displayName} completed ${multipleObjectivesComplete ? "some objectives" : "an objective"}!`
					});

					// Iterate through each quest with completed objectives and add them as fields to the embed
					for (let completedObjectives of userQuestProgress.newObjectivesComplete) {
						let quest = questManager.getActive(completedObjectives.quest_id);
						if (!quest) continue;

						// Get the QuestProgressData for the current quest ID
						let _questProgress = userQuestProgress.progress.find(d => d.quest_id === completedObjectives.quest_id);

						// Get objective count
						let objectiveCount = {
							has: _questProgress.objectives.filter(o => o.complete).length,
							outOf: _questProgress.objectives.length,
						};

						// Format objectives into strings
						let objectives_f = completedObjectives.objectives.map(o =>
							`- ${questManager.toString.objectiveDetails(quest, o.type, o).slice(6)}`
						);

						// Add the objectives to the embed as a field
						embed_completedObjectives.addFields({
							name: `**${quest.name}** \`📈 ${objectiveCount.has}/${objectiveCount.outOf}\``,
							value: `>>> ${objectives_f.join("\n")}`
						});
					}

					// Check if the embed has fields before sending
					if (embed_completedObjectives.data?.fields?.length)
						return await embed_completedObjectives.send({ sendMethod: "followUp" }).catch(() => null);
				});
			});
		} catch (err) {
			return logger.error(
				"Could not execute command",
				`SLSH_CMD: /${args.interaction.commandName} | guildID: ${args.interaction.guild.id} | userID: ${args.interaction.user.id}`,
				err
			);
		}
	}
};
