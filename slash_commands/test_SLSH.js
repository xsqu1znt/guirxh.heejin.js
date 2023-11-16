const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed, markdown } = require("../modules/discordTools");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");

module.exports = {
	options: { deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let inventoryStats = await userManager.inventory.stats(interaction.user.id);

		let stats_f = inventoryStats.categories.map(cat =>
			markdown.ansi(`${cardManager.cards.category.meta.base[cat.name].emoji} ${cat.name}: ${cat.has}/${cat.outOf}`, {
				format: "bold",
				text_color: cardManager.cards.category.meta.base[cat.name].color_ansi
			})
		);

		// prettier-ignore
		// Insert inventory count
		stats_f.splice(5, 0,
			markdown.ansi(`⚪ total: ${inventoryStats.count.has}/${inventoryStats.count.outOf}`, {
				format: "bold", text_color: "white"
			})
		);

		/* - - - - - { Creat the Embed } - - - - - */
		let embed_invStats = new BetterEmbed({ interaction });

		embed_invStats.addFields(
			{
				name: "`🌕` Normal Sets",
				value: `\`\`\`ansi\n${stats_f.slice(0, 6).join("\n")}\`\`\``,
				inline: true
			},
			{
				name: "`🌗` Special Sets",
				value: `\`\`\`ansi\n${stats_f.slice(6).join("\n")}\`\`\``,
				inline: true
			}
		);

		return await embed_invStats.send();
	}
};
