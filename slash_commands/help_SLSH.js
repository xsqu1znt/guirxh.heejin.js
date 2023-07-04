const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { BetterEmbed } = require('../modules/discordTools');

module.exports = {
    options: { deferReply: false, dontRequireUserData: true },

    builder: new SlashCommandBuilder().setName("help")
        .setDescription("Get information about the commands"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_help = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | help", user: interaction.member }
        });

        let slashCommands = [...client.slashCommands.values()].filter(slsh => slsh?.helpIcon);

        slashCommands.forEach(slsh => {
            if (slsh?.options?.icon) embed_help.addFields({
                name: `\`${slsh.options.icon}\` ${slsh.builder.name}`,
                value: `> ${slsh.builder.description}`, inline: true
            });
        });


        return await embed_help.send();
    }
};