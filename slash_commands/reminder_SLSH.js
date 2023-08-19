const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { error_ES, user_ES } = require("../modules/embedStyles/index");
const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { userManager } = require("../modules/mongo/index");
const _jsT = require("../modules/jsTools/_jsT");

const config_player = require("../configs/config_player.json");

module.exports = {
	options: { icon: "⏰", deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("reminders")
		.setDescription("View or toggle your cooldown reminders")

		.addStringOption(option => option.setName("toggle").setDescription("The cooldown you want to toggle being reminded for")
        .addChoices(
				{ name: "Daily", value: "daily" },
				{ name: "Stage", value: "stage" },
				{ name: "Random", value: "random" },

				{ name: "Drop General", value: "drop_general" },
				{ name: "Drop Weekly", value: "drop_weekly" },
				{ name: "Drop Season", value: "drop_season" },
				{ name: "Drop Event 1", value: "drop_event_1" },
				{ name: "Drop Event 2", value: "drop_event_2" }
			)
		),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		// prettier-ignore
		let cooldowns = Object.entries(config_player.cooldowns)
            .filter(cd => cd[1]).map(cd => cd[0]);

		// Fetch the user from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "reminder" });

		// prettier-ignore
		// Create the embed :: { REMINDERS }
		let embed_reminders = new BetterEmbed({
			interaction, author: { text: "$USERNAME | reminders", iconURL: true }
        });

		return await embed_reminders.send();
	}
};
