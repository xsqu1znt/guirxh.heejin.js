const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { error_ES, user_ES } = require("../modules/embedStyles/index");
const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { userManager } = require("../modules/mongo/index");
const _jsT = require("../modules/jsTools/_jsT");

module.exports = {
	options: { icon: "⏰", deferReply: false },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("reminder")
		.setDescription("View or toggle your cooldown reminders")

		.addStringOption(option => option.setName("edit").setDescription("The cooldown you want to edit/toggle")
			.addChoices(
				{ name: "Daily", value: "daily" },
				{ name: "Stage", value: "stage" },
				{ name: "Random", value: "random" },

				{ name: "Drop General", value: "drop_general" },
				{ name: "Drop Weekly", value: "drop_weekly" },
				{ name: "Drop Season", value: "drop_season" },
				{ name: "Drop Event 1", value: "drop_event_1" },
				{ name: "Drop Event 2", value: "drop_event_2" }
			))
	
		.addStringOption(option => option.setName("notify").setDescription("Choose where your reminder is sent")
			.addChoices({ name: "📫 DM", value: "dm" }, { name: "💬 Channel", value: "channel" })),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let edit = interaction.options.getString("edit");
		let notify = interaction.options.getString("notify");

		// Toggle the reminder
		if (edit && !notify) {
			await interaction.deferReply();

			let enabled = await userManager.reminders.toggle(interaction.user.id, edit);
			let cooldown_f = _jsT.toTitleCase(edit.replace(/_/g, " "));

			// prettier-ignore
			return await new BetterEmbed({
				interaction, description: `**${cooldown_f}** is now \`${enabled ? "✔️ enabled" : "❌ disabled"}\``
			}).send();
		}

		// prettier-ignore
		// User must provide a reminder type to edit it's notification mode
		if (notify && !edit) return await error_ES.send({
			interaction, description: "You didn't select a reminder to edit", ephemeral: true
		});

		// Set the reminder's notification mode
		if (edit && notify) {
			await interaction.deferReply();

			await userManager.reminders.setMode(interaction.user.id, notify);

			let mode_f = "";
			// prettier-ignore
			switch (notify) {
				case "dm": mode_f = "DM your reminder"; break;
				case "channel": mode_f = "send your reminder in the channel you ran the command"; break;
			}

			// prettier-ignore
			return await new BetterEmbed({
				interaction, description: `**${cooldown_f}** will now ${mode_f}`
			}).send();
		}

		/* - - - - - - - - - - */
		await interaction.deferReply();

		// Fetch the user from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "reminder" });

		// Create the embed :: { REMINDERS }
		let embed_reminders = user_ES.reminders(interaction.member, userData);

		return await embed_reminders.send({ interaction });
	}
};
