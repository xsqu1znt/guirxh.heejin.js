const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { BetterEmbed } = require('../modules/discordTools');

module.exports = {
    builder: new SlashCommandBuilder().setName("view")
        .setDescription("View info about a card")

        .addStringOption(option => option.setName("uid")
            .setDescription("UID of a card you own")
        )

        .addStringOption(option => option.setName("gid")
            .setDescription("GID of any card")
        )

        .addStringOption(option => option.setName("setid")
            .setDescription("Set ID to view all cards in a set")
        )

        .addStringOption(option => option.setName("section")
            .setDescription("More sections to view")

            .addChoices(
                { name: "⭐ favorite", value: "favorite" },
                { name: "🏃 idol", value: "idol" },
                { name: "🔒 vault", value: "vault" },
                { name: "👯 team", value: "team" }
            )
        ),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_view = new BetterEmbed({
            interaction, author: { text: `%AUTHOR_NAME | view`, user: interaction.user },
            description: "You really thought this command would work? Shame on you!"
        });

        return await embed_view.send();
    }
};