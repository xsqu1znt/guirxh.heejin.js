const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { error_ES, user_ES } = require("../modules/embedStyles/index");
const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { userManager } = require("../modules/mongo/index");
const _jsT = require("../modules/jsTools/_jsT");

const config_player = require("../configs/config_player.json");

module.exports = {
	options: { icon: "⏰", deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("reminder")
		.setDescription("View or toggle your cooldown reminders")

		.addStringOption(option => option.setName("to").setDescription("The cooldown you want to toggle being reminded for")
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
		let toggle = interaction.options.getString("to");

		// Toggle the reminder the user's cooldown reminder
		if (toggle) {
			let _enabled = await userManager.reminders.toggle(interaction.user.id, toggle);
			let _cooldown_f = _jsT.toTitleCase(toggle.replace(/_/g, " "));

			// prettier-ignore
			let embed_reminder_toggle = new BetterEmbed({
				interaction, description: `**${_cooldown_f}** is now \`${_enabled ? "✔️ enabled" : "❌ disabled"}\``
            });

			return await embed_reminder_toggle.send();
		}

		// Fetch the user from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "reminder" });

		// Create the embed :: { REMINDERS }
		let embed_reminders = user_ES.reminders(interaction.member, userData);

		return await embed_reminders.send();
	}
};
