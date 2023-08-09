const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

//// const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { BetterEmbed } = require("../modules/discordTools");

module.exports = {
	options: { deferReply: false },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		//// let embed = new BetterEmbed({ interaction, author: { text: "$USERNAME | inventory", user: interaction.member } });
		let embed = new BetterEmbed({ interaction, author: { text: "%AUTHOR_NAME | inventory", user: interaction.member } });

		// https://cdn.discordapp.com/attachments/1014199645750186044/1023271880968384592/Heeseung.png
		// > **`5ZM83A`** `5673` `🗣️856`  `comn`\n> `🏫` **Future Perfect** :: `ENHYPEN` Heeseung\n> `LV. 1` `🎤 100` : `💖 100` `💰 30`

		// https://cdn.discordapp.com/attachments/1014199645750186044/1023271880968384592/Heeseung.png
		// > **`VVRN33`** `5673` `🗣️856`  `comn`\n> `🏫` **iKON** :: `U` Bobby\n> `LV. 1` `🎤 250` : `💖 250` `💰 45`

		// https://cdn.discordapp.com/attachments/1014199645750186044/1023271880968384592/Heeseung.png
		// > **`8582GT`** `5673` `🗣️856`  `comn`\n> `🏫` **Kyary Pamyu Pamyu** :: `PONPONPON` Kyary Pamyu Pamyu\n> `LV. 1` `🎤 100` : `💖 456` `💰 70`

		// https://cdn.discordapp.com/attachments/1014199645750186044/1023271880968384592/Heeseung.png
		// > **`PTT192`** `5673` `🗣️856`  `comn`\n> `🏫` **LOONA** :: `Paint The Town` Olivia Hye\n> `LV. 1` `🎤 100` : `💖 100` `💰 70`

		// \u200b - invisible character

		/* 2 COLUMN */
		/* embed.addFields(
			{
				name: "```field text 1```",
				value: "> **`5ZM83A`** `5673` `🗣️856`  `comn`\n> `🏫` **Future Perfect** :: `ENHYPEN` Heeseung\n> `LV. 1` `🎤 100` : `💖 100` `💰 30`\n\n> **`VVRN33`** `5673` `🗣️856`  `comn`\n> `🏫` **iKON** :: `U` Bobby\n> `LV. 1` `🎤 250` : `💖 250` `💰 45`\n\n> **`8582GT`** `5673` `🗣️856`  `comn`\n> `🏫` **Kyary Pamyu Pamyu** :: `PONPONPON` Kyary Pamyu Pamyu\n> `LV. 1` `🎤 100` : `💖 456` `💰 70`\n\n> **`PTT192`** `5673` `🗣️856`  `comn`\n> `🏫` **LOONA** :: `Paint The Town` Olivia Hye\n> `LV. 1` `🎤 100` : `💖 100` `💰 70`",
				inline: true
			},
			{
				name: "```field text 2```",
				value: "> **`5ZM83A`** `5673` `🗣️856`  `comn`\n> `🏫` **Future Perfect** :: `ENHYPEN` Heeseung\n> `LV. 1` `🎤 100` : `💖 100` `💰 30`\n\n> **`VVRN33`** `5673` `🗣️856`  `comn`\n> `🏫` **iKON** :: `U` Bobby\n> `LV. 1` `🎤 250` : `💖 250` `💰 45`\n\n> **`8582GT`** `5673` `🗣️856`  `comn`\n> `🏫` **Kyary Pamyu Pamyu** :: `PONPONPON` Kyary Pamyu Pamyu\n> `LV. 1` `🎤 100` : `💖 456` `💰 70`\n\n> **`PTT192`** `5673` `🗣️856`  `comn`\n> `🏫` **LOONA** :: `Paint The Town` Olivia Hye\n> `LV. 1` `🎤 100` : `💖 100` `💰 70`",
				inline: true
			}
        ); */

		/* embed.addFields(
			{
				name: "\u200b",
				value: "> `🧸` **Teddy Bear**\n> `STAYC` Sieun\n> `LV. 1` `epic` `💰 35`\n> `🎤 100` : `💖 100`\n> `🚗` **2 Baddies**\n> `STAYC` Sieun\n> `LV. 1` `comn` `💰 30`\n> `🎤 100` : `💖 100`\n> `🧸` **Teddy Bear**\n> `STAYC` Sieun\n> `LV. 1` `epic` `💰 35`\n> `🎤 100` : `💖 100`\n> `🚗` **2 Baddies**\n> `STAYC` Sieun\n> `LV. 1` `comn` `💰 30`\n> `🎤 100` : `💖 100`\n> `🧸` **Teddy Bear**\n> `STAYC` Sieun\n> `LV. 1` `epic` `💰 35`\n> `🎤 100` : `💖 100`",
				inline: true
			},
			{
				name: "\u200b",
				value: "> `🧸` **Teddy Bear**\n> `STAYC` Sieun\n> `LV. 1` `epic` `💰 35`\n> `🎤 100` : `💖 100`\n> `🚗` **2 Baddies**\n> `STAYC` Sieun\n> `LV. 1` `comn` `💰 30`\n> `🎤 100` : `💖 100`\n> `🧸` **Teddy Bear**\n> `STAYC` Sieun\n> `LV. 1` `epic` `💰 35`\n> `🎤 100` : `💖 100`\n> `🚗` **2 Baddies**\n> `STAYC` Sieun\n> `LV. 1` `comn` `💰 30`\n> `🎤 100` : `💖 100`\n> `🧸` **Teddy Bear**\n> `STAYC` Sieun\n> `LV. 1` `epic` `💰 35`\n> `🎤 100` : `💖 100`",
				inline: true
			}
		); */

		/* 2 COLUMN */
		embed.addFields(
			{
				name: "\u200b",
				value: "> **`5ZM83A`** `5673` `🗣️856`  `comn`\n> `🏫` **Future Perfect** :: `ENHYPEN` Heeseung\n> `LV. 1` `🎤 100` : `💖 100` `💰 30`",
				inline: true
			},
			{
				name: "\u200b",
				value: "> **`VVRN33`** `5673` `🗣️856`  `comn`\n> `🏫` **iKON** :: `U` Bobby\n> `LV. 1` `🎤 250` : `💖 250` `💰 45`",
				inline: true
			},

			{
				name: "\u200b",
				value: "```Total cards```",
				inline: false
			},

			{
				name: "\u200b",
				value: "> **`5ZM83A`** `5673` `🗣️856`  `comn`\n> `🏫` **Future Perfect** :: `ENHYPEN` Heeseung\n> `LV. 1` `🎤 100` : `💖 100` `💰 30`",
				inline: true
			},
			{
				name: "\u200b",
				value: "> **`VVRN33`** `5673` `🗣️856`  `comn`\n> `🏫` **iKON** :: `U` Bobby\n> `LV. 1` `🎤 250` : `💖 250` `💰 45`",
				inline: true
			}
		);

		return await embed.send();
	}
};
