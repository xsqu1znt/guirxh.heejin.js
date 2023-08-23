const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");
const _dsT = require("../modules/discordTools/_dsT");

module.exports = {
	options: { deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let embed = new BetterEmbed({ interaction });

		// prettier-ignore
		let category_colors = Object.values(cardManager.cards).map(c => c.ansi);

		let categories = cardManager.category.names.base;
		// prettier-ignore
		let categories_f = categories.map((cat, idx) => _dsT.markdown.ansi(cat, { format:"bold", text_color: category_colors[idx] }));

		let stats = await userManager.inventory.stats(interaction.user.id);
		let inventory_count = await userManager.inventory.count(interaction.user.id, true);

		// prettier-ignore
		let stats_f = stats.map((s, idx) =>
			`🃏 ${categories_f[idx]}: ${_dsT.markdown.ansi(`${s.has}/${s.outOf}`, { format:"bold", text_color: category_colors[idx] })}`
		);

		let stats_f_general = stats_f.slice(0, 5);
		stats_f_general.push(_dsT.markdown.ansi(`total: ${inventory_count}`, { format: "bold", text_color: "white" }));
		let stats_f_special = stats_f.slice(5);

		embed.addFields(
			{ name: "`🌕` Normal Sets", value: `\`\`\`ansi\n${stats_f_general.join("\n")}\n\`\`\``, inline: true },
			{ name: "`🌗` Special Sets", value: `\`\`\`ansi\n${stats_f_special.join("\n")}\n\`\`\``, inline: true }
		);

		return await embed.send();
	}
};
