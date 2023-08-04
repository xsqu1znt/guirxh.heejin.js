const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");
const _jsT = require("../modules/jsTools/_jsT");

const config_player = require("../configs/config_player.json");
const config_event = require("../configs/config_event.json");

module.exports = {
	options: { icon: "💧", deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("drop")
        .setDescription("Drop a random card")
        .setRequired(true)
    
        .addStringOption(option => option.setName("card").setDescription("Pick a type of drop")
            .addChoices(
                { name: "🃏 general", value: "general" },
                { name: "📅 weekly", value: "weekly" },
                { name: "☀️ season", value: "season" },
                { name: "🎆 event 1", value: "event_1" },
                { name: "🎆 event 2", value: "event_2" }
            )
        ),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		// Create the embed :: { DROP }
		let embed_drop = new BetterEmbed({ interaction, author: { text: "$USERNAME | drop", user: interaction.member } });

		let cards = [];
		let dropType = "";

		// prettier-ignore
		switch (interaction.options.getString("card")) {
			case "general":
				embed_drop.setAuthor({ text: "$USERNAME | drop" });
				cards = cardManager.get.drop("general"); dropType = "drop_general";
				break;

			case "weekly":
				embed_drop.setAuthor({ text: "$USERNAME | weekly" });
				cards = cardManager.get.drop("weekly"); dropType = "drop_weekly";
				break;

			case "season":
				if (config_event.season === ("none" || ""))
					return await embed_drop.send({ description: "There is no `season` right now" });

				embed_drop.setAuthor({ text: "$USERNAME | season" });
				cards = cardManager.get.drop("season"); dropType = "drop_season";
				break;

			case "event_1":
				if (config_event.season === ("none" || ""))
					return await embed_drop.send({ description: "There is no `event 1` right now" });

				embed_drop.setAuthor({ text: "$USERNAME | event 1" });
				cards = cardManager.get.drop("event_1"); dropType = "drop_event_1";
				break;

			case "event_2":
				if (config_event.season === ("none" || ""))
					return await embed_drop.send({ description: "There is no `event 2` right now" });

				embed_drop.setAuthor({ text: "$USERNAME | event 2" });
				cards = cardManager.get.drop("event_2"); dropType = "drop_event_2";
				break;
        }

		// Check if the user has an active cooldown :: { DROP }
		let cooldown_drop = await userManager.cooldowns.check(interaction.user.id, dropType);
		// prettier-ignore
		if (cooldown_drop) return await embed_drop.send({ description: `Your next drop will be available **${userCooldownETA}**` });

		await Promise.all([
			// Add the cards to the user's card_inventory
			userManager.inventory.add(interaction.user.id, cards),
			// Give the user XP
			userManager.xp.increment(
				interaction.user.id,
				_jsT.randomNumber(config_player.xp.user.rewards.drop.MIN, config_player.xp.user.rewards.drop.MAX)
			),
			// Update the user's quest progress
			userManager.quest.progress.increment.inventory(interaction.user.id, cards.length),
			// Reset the user's cooldown :: { DROP }
			userManager.cooldowns.set(interaction.user.id, dropType),
			// Set the user's next reminder :: { DROP }
			userManager.reminders.set(interaction.user.id, dropType)
		]);
	}
};
