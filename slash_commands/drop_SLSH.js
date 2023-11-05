const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { error_ES, cooldown_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");
const dropManager = require("../modules/dropManager");
const userParser = require("../modules/userParser");
const _jsT = require("../modules/jsTools/_jsT");

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
			description: `Your \`${_jsT.toTitleCase(dropType.replace("_", " "))}\` will be ready **${cooldown_drop}**`
		});

		// Create the embed :: { DROP }
		let embed_drop = new BetterEmbed({ interaction, author: { text: "$USERNAME | drop", iconURL: true } });

		/* - - - - - { Drop the Cards } - - - - - */
		let cards = [];

		switch (dropType) {
			case "drop_general":
				embed_drop.setAuthor("$USERNAME | drop");
				cards.push(...(await dropManager.drop(interaction.user.id, choice)));
				break;

			case "drop_weekly":
				embed_drop.setAuthor("$USERNAME | weekly");
				cards.push(...(await dropManager.drop(interaction.user.id, choice)));
				break;

			case "drop_season":
				// prettier-ignore
				if (!config.event.season.NAME) return await error_ES.send({
					interaction, description: "There is no `season` right now", ephemeral: true
				});

				embed_drop.setAuthor("$USERNAME | season");
				cards.push(...(await dropManager.drop(interaction.user.id, choice)));
				break;

			case "drop_event_1":
				// prettier-ignore
				if (!config.event.event_1.NAME) return await error_ES.send({
					interaction, description: "There is no `event 1` right now", ephemeral: true
				});

				embed_drop.setAuthor("$USERNAME | event 1");
				cards.push(...(await dropManager.drop(interaction.user.id, choice)));
				break;

			case "drop_event_2":
				// prettier-ignore
				if (!config.event.event_2.NAME) return await error_ES.send({
					interaction, description: "There is no `event 2` right now", ephemeral: true
				});

				embed_drop.setAuthor("$USERNAME | event 2");
				cards.push(...(await dropManager.drop(interaction.user.id, choice)));
				break;
		}

		/* - - - - - { Update User Data } - - - - - */
		await Promise.all([
			// Add the cards to the user's card_inventory
			userManager.inventory.add(interaction.user.id, cards),
			// Give the user XP
			userManager.levels.xp.increment(
				interaction.user.id,
				_jsT.randomNumber(config.player.xp.user.rewards.drop.MIN, config.player.xp.user.rewards.drop.MAX),
				"drop"
			),
			// Update the user's quest progress
			userManager.quests.progress.increment.inventory(interaction.user.id, cards.length),
			// Reset the user's cooldown :: { DROP }
			userManager.cooldowns.set(interaction.user.id, dropType),
			// Set the user's next reminder :: { DROP }
			userManager.reminders.set(interaction.user.id, dropType, interaction.channel.id)
		]);

		/* - - - - - { Edit the Embed } - - - - - */
		// prettier-ignore
		// Check if the user has duplicates of what was dropped
		let cards_isDupe = await userManager.inventory.has(interaction.user.id, cards.map(c => c.globalID));

		// prettier-ignore
		// Format the cards into strings
		let cards_f = cards.map((c, idx) => cardManager.toString.inventoryEntry(c, { duplicate: cards_isDupe[idx] })
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
		return await embed_drop.send({
			description: cards_f.join("\n"),
			imageURL: cards_last.imageURL,
			footer: {
				text: "React to sell",
				iconURL: "https://cdn.discordapp.com/attachments/1014199645750186044/1104414979798618243/carrot.png"
			}
		});
	}
};
