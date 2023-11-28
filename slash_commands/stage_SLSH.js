const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { error_ES, cooldown_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const Stage = require("../modules/stage");

module.exports = {
	options: { icon: "🎤", deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("stage")
		.setDescription("LV. your idol by challenging a rival to a duel")
		.addUserOption(option => option.setName("player").setDescription("Challenge a player to a duel")),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let rival = interaction.options.getUser("player") || null;

		/* - - - - - { COOLDOWNS } - - - - - */
		/// Check if the user has an active cooldown :: { STAGE }
		let cooldown_stage_user = await userManager.cooldowns.eta(interaction.user.id, "stage");
		// prettier-ignore
		if (cooldown_stage_user) return await cooldown_ES.send({
            interaction, description: `Your stage will be ready **${cooldown_stage_user}**`
		});

		/* - - - - - { RIVAL } - - - - - */
		if (rival) {
			// prettier-ignore
			// A player can't duel themself
			if (rival.id === interaction.user.id) return await error_ES.send({
				interaction, description: "You cannot duel yourself, silly!"
			});

			// prettier-ignore
			// Check if the rival player started
			if (!(await userManager.exists(rival?.id))) return await error_ES.send({
				interaction, description: `${rival} has not started yet`
			});

			/* - - - - - { COOLDOWNS } - - - - - */
			/// Check if the rival has an active cooldown :: { STAGE }
			let cooldown_stage_rival = await userManager.cooldowns.eta(rival?.id, "stage");
			// prettier-ignore
			if (cooldown_stage_rival) return await cooldown_ES.send({
            	interaction, description: `Your stage will be ready **${cooldown_stage_rival}**`
			});
		}

		/* - - - - - { USERDATA } - - - - - */
		// Fetch the user and rival from Mongo
		let userData = {
			user: await userManager.fetch(interaction.user.id, { type: "essential" }),
			rival: rival ? await userManager.fetch(rival.id, { type: "essential" }) : null
		};

		// Get the player's idol from their card_inventory
		let card_idol = {
			user: await userManager.inventory.get(interaction.user.id, { uids: userData.user.card_selected_uid }),
			rival: rival ? await userManager.inventory.get(rival?.id, { uids: userData.rival?.card_selected_uid }) : null
		};

		/* - - - - - { USER & RIVAL IDOL } - - - - - */
		// prettier-ignore
		if (!card_idol.user) return await error_ES.send({
			interaction, description: "You do not have an `🏃 idol` set\nUse `/set` `edit:🏃 idol` `add:UID`"
		});
		// prettier-ignore
		if (!card_idol.rival && rival) return await error_ES.send({
			interaction, description: `${rival} does not have an \`🏃 idol\` set\nUse \`/set\` \`edit:🏃 idol\` \`add:UID\``
		});

		/* - - - - - { COOLDOWNS } - - - - - */
		// Set the user's cooldown and reminder
		await Promise.all([
			userManager.cooldowns.set(interaction.user.id, "stage"),
			userManager.reminders.set(interaction.user.id, "stage"),
			// Set the rival's cooldown and reminder
			rival ? userManager.cooldowns.set(rival.id, "stage") : true,
			rival ? userManager.reminders.set(rival.id, "stage") : true
		]);

		/* - - - - - { STAGE } - - - - - */
		// Create the Stage instance
		let stage = new Stage({
			interaction,
			opponents: { home: interaction.member, away: rival },
			idol: { home: card_idol.user, away: card_idol.rival }
		});

		return await stage.start();
	}
};
