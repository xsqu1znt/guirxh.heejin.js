const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { cooldown_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");
const dropManager = require("../modules/dropManager");
const userParser = require("../modules/userParser");
const _jsT = require("../modules/jsTools/_jsT");

const config_player = require("../configs/config_player.json");
const config_event = require("../configs/config_event.json");
const config_bot = require("../configs/config_bot.json");

module.exports = {
	options: { icon: "💧", deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("drop")
        .setDescription("Drop a random card")
        
        .addStringOption(option => option.setName("card").setDescription("Pick a type of drop")
            .setRequired(true)
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
		let dropType = `drop_${interaction.options.getString("card")}`;

		/// Check if the user has an active cooldown :: { DROP }
		let cooldown_drop = await userManager.cooldowns.check(interaction.user.id, dropType);
		// prettier-ignore
		if (cooldown_drop) return await cooldown_ES.send({
			interaction, ephemeral: true,
			description: `Your drop will be ready **${cooldown_drop}**`
		});

		// Create the embed :: { DROP }
		let embed_drop = new BetterEmbed({ interaction, author: { text: "$USERNAME | drop", user: interaction.member } });

		let cards = [];

		// prettier-ignore
		switch (dropType) {
			case "drop_general":
                embed_drop.options.author.text = "$USERNAME | drop";
				cards = await cardManager.drop(interaction.user.id, "general"); break;

			case "drop_weekly":
				embed_drop.options.author.text = "$USERNAME | weekly";
				cards = await cardManager.drop(interaction.user.id, "weekly"); break;

			case "drop_season":
				if (!config_event.season.NAME)
					return await embed_drop.send({ description: "There is no `season` right now" });

				embed_drop.options.author.text = "$USERNAME | season";
				cards = await cardManager.drop(interaction.user.id, "season"); break;

			case "drop_event_1":
				if (!config_event.event_1.NAME)
					return await embed_drop.send({ description: "There is no `event 1` right now" });

				embed_drop.options.author.text = "$USERNAME | event 1";
				cards = await cardManager.drop(interaction.user.id, "event_1"); break;

			case "drop_event_2":
				if (!config_event.event_2.NAME)
					return await embed_drop.send({ description: "There is no `event 2` right now" });

				embed_drop.options.author.text = "$USERNAME | event 2";
				cards = await cardManager.drop(interaction.user.id, "event_2"); break;
        }

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

		/// Update drop embed
		// Fetch the user's card_inventory from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "inventory" });

		// Format the cards into list entries
		let cards_f = cards.map(c =>
			cardManager.toString.inventoryEntry(c, {
				duplicate: userParser.cards.hasDuplicates(userData, c.globalID),
				simplify: true
			})
		);

		// Add the index for each card in the list
		if (cards_f.length > 1) cards_f = cards_f.map((str, idx) => `${config_bot.emojis.numbers[idx].EMOJI} ${str}`);

		// Get the last card in the array
		let cards_last = cards.slice(-1)[0];

		return await embed_drop.send({
			description: cards_f.join("\n"),
			imageURL: cards_last.imageURL,

			// prettier-ignore
			footer: {
				text: cards.length > 1
					? "React with any number and confirm to sell"
					: "React to sell this card",
				iconURL: "https://cdn.discordapp.com/attachments/1014199645750186044/1104414979798618243/carrot.png"
			}
		});
	}
};
