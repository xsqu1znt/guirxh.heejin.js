const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools");
const { error_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");
const jt = require("../modules/jsTools");

const config = { player: require("../configs/config_player.json") };

async function subcommand_favorite_add(interaction, uid) {}

module.exports = {
	options: { icon: "🍪", deferReply: false, botAdminOnly: false, guildAdminOnly: false },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("set")
        .setDescription("Add/remove a card from something")

        .addStringOption(option => option.setName("edit").setDescription("Choose what you want to set")
            .setRequired(true)
            .addChoices(
                { name: "⭐ favorite", value: "favorite" },
                { name: "🏃 idol", value: "idol" },
                { name: "🔒 vault", value: "vault" },
                { name: "👯 team", value: "team" }
            )
        )

        .addStringOption(option => option.setName("add").setDescription("Add a card using its UID separate by comma"))
        .addStringOption(option => option.setName("remove").setDescription("Remove a card using its UID separate by comma")),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		// prettier-ignore
		let choices = [
            "What's up, **$USERNAME**! Have a cookie! :cookie:",
            "Hey, **$USERNAME**! Have a glass of milk! :milk:",
        ];

		// prettier-ignore
		let embed_cookie = new BetterEmbed({
            interaction, author: { iconURL: true },
            description: jt.choice(choices), timestamp: true
        });

		return await embed_cookie.send();
	}
};
