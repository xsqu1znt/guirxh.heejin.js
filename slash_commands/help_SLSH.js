const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { BetterEmbed } = require('../modules/discordTools');

module.exports = {
    builder: new SlashCommandBuilder().setName("help")
        .setDescription("Get information about the commands"),

    helpIcon: "🤝",

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_help = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | help", user: interaction.member }
        });

        let slashCommands = [...client.slashCommands.values()];

        slashCommands.forEach((slsh, idx) => embed_help.addFields({
            name: `\`${slsh.helpIcon}\` ${slsh.builder.name}`,
            value: `> ${slsh.builder.description}`,
            inline: true
        }));


        return await embed_help.send();
    }
};