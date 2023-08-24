const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { error_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");
const _jsT = require("../modules/jsTools/_jsT");
const Stage = require("../modules/stage");

const config = {
	player: require("../configs/config_player.json"),
	bot: require("../configs/config_bot.json")
};

module.exports = {
	options: { icon: "🎤", deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("stage")
        .setDescription("LV. your idol by challenging a rival to a duel"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let rival = interaction.user || null;

		/// Check if the user has an active cooldown :: { STAGE }
		let cooldown_stage = await userManager.cooldowns.check(interaction.user.id, "stage");
		// prettier-ignore
		if (cooldown_stage) return await cooldown_ES.send({
            interaction, description: `Your stage will be ready **${cooldown_stage}**`
		});

		// prettier-ignore
		// A player can't duel themself
		if (rival?.id === interaction.user.id) return await error_ES.send({
			interaction, description: "You cannot duel yourself, silly!"
		});

		// Check if the rival player started
		if (!(await userManager.exists(rival?.id)))
			return await error_ES.send({
				interaction,
				description: `${rival} has not started yet`
			});

		// Fetch the user & rival from Mongo :: { RIVAL }
		let userData = {
			user: await userManager.fetch(interaction.user.id, { type: "essential" }),
			rival: await userManager.fetch(rival?.id, { type: "essential" })
		};

		/// Get the player's idol from their card_inventory
		let card_idol = {
			user: await userManager.inventory.get(interaction.user.id, { uids: userData.user.card_selected_uid }),
			rival: await userManager.inventory.get(rival?.id, { uids: userData.rival?.card_selected_uid })
		};

		// Pick a random card for
		card_idol.rival ||= cardManager.get.random({ basic: true, lvl_min: 0, lvl_max: 100 });

		// prettier-ignore
		if (!card_idol.user) return await error_ES.send({
			interaction, description: "You do not have an `🏃 idol` set\nUse \`/set\` \`edit:🏃 idol\` \`add:UID\`"
		});
		// prettier-ignore
		if (!card_idol.rival && rival) return await error_ES.send({
			interaction, description: `${rival} does not have an \`🏃 idol\` set\nUse \`/set\` \`edit:🏃 idol\` \`add:UID\``
		});
	}
};
