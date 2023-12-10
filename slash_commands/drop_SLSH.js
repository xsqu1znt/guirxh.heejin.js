const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { error_ES, cooldown_ES } = require("../modules/embedStyles/index");
const { BetterEmbed } = require("../modules/discordTools");
const { userManager } = require("../modules/mongo/index");
const InventoryEditModule = require("../modules/inventoryEditModule");
const cardManager = require("../modules/cardManager");
const dropManager = require("../modules/dropManager");
const jt = require("../modules/jsTools");

const config = {
	bot: require("../configs/config_bot.json"),
	player: require("../configs/config_player.json"),
	event: require("../configs/config_event.json")
};

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
		let choice = interaction.options.getString("card");
		let dropType = `drop_${choice}`;

		// Check if the user has an active cooldown :: { DROP }
		let cooldown_drop = await userManager.cooldowns.eta(interaction.user.id, dropType);
		// prettier-ignore
		if (cooldown_drop) return await cooldown_ES.send({
			interaction, ephemeral: true,
			description: `Your \`${jt.toTitleCase(dropType.replace("_", " "))}\` will be ready **${cooldown_drop}**`
		});

		// Create the embed :: { DROP }
		let embed_drop = new BetterEmbed({ interaction, author: { text: "$USERNAME | drop", iconURL: true } });

		/* - - - - - { Drop the Cards } - - - - - */
		switch (dropType) {
			case "drop_general":
				embed_drop.setAuthor({ text: "$USERNAME | drop" });
				break;

			case "drop_weekly":
				embed_drop.setAuthor({ text: "$USERNAME | weekly" });
				break;

			case "drop_season":
				// prettier-ignore
				if (!config.event.season.NAME) return await error_ES.send({
					interaction, description: "There is no `season` right now", ephemeral: true
				});

				embed_drop.setAuthor({ text: "$USERNAME | season" });
				break;

			case "drop_event_1":
				// prettier-ignore
				if (!config.event.event_1.NAME) return await error_ES.send({
					interaction, description: "There is no `event 1` right now", ephemeral: true
				});

				embed_drop.setAuthor({ text: "$USERNAME | event 1" });
				break;

			case "drop_event_2":
				// prettier-ignore
				if (!config.event.event_2.NAME) return await error_ES.send({
					interaction, description: "There is no `event 2` right now", ephemeral: true
				});

				embed_drop.setAuthor({ text: "$USERNAME | event 2" });
				break;
		}

		let { cards, dupeIndex } = await dropManager.drop(interaction.user.id, choice);

		/* - - - - - { Update User Data } - - - - - */
		let xpGained = jt.randomNumber(config.player.xp.user.rewards.drop.MIN, config.player.xp.user.rewards.drop.MAX);
		await Promise.all([
			// Add the cards to the user's card_inventory
			userManager.inventory.add(interaction.user.id, cards),
			// Give the user XP
			userManager.levels.increment.xp(interaction.user.id, xpGained, "drop"),
			// Reset the user's cooldown :: { DROP }
			userManager.cooldowns.set(interaction.user.id, dropType),
			// Set the user's next reminder :: { DROP }
			userManager.reminders.set(interaction.user.id, dropType, interaction.channel.id),

			// Update the user's quest progress
			userManager.quests.increment.inventory(interaction.user.id, cards.length),
			userManager.quests.increment.level(interaction.user.id, xpGained, "xp"),
			// Update the user's statistics
			userManager.statistics.increment.cardsDropped(interaction.user.id, cards.length)
		]);

		/* - - - - - { Edit the Embed } - - - - - */
		// prettier-ignore
		// Format the cards into strings
		let cards_f = cards.map((c, idx) => cardManager.toString.inventoryEntry(c, { duplicate: dupeIndex[idx] })
			// Get rid of the (> ) quote markdown
			.substring(2)
		);

		// Index the cards if there's more than 1
		if (cards_f.length > 1) cards_f = cards_f.map((str, idx) => `${config.bot.emojis.numbers[idx].EMOJI} ${str}`);

		// Get the last card in the array
		let cards_last = cards.slice(-1)[0];

		// Add the card info to the embed as fields
		// embed_drop.addFields(...cards_f.map(f => ({ name: "\u200b", value: f })));

		// Send the embed
		let message = await embed_drop.send({
			description: cards_f.join("\n\n"),
			imageURL: cards_last.imageURL,
			footer: {
				text: "React to sell",
				iconURL: "https://cdn.discordapp.com/attachments/1014199645750186044/1104414979798618243/carrot.png"
			}
		});

		// Add inventory edit reactions
		new InventoryEditModule(client, interaction, message, { cards, dupeIndex, modules: ["sell"] });

		return message;
	}
};
