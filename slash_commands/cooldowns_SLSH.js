const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userCooldowns_ES } = require('../modules/embedStyles');
const { userManager } = require('../modules/mongo');

module.exports = {
    builder: new SlashCommandBuilder().setName("cooldowns").setDescription("Check your cooldowns"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let userData = await userManager.fetch(interaction.user.id, "essential");
        let embed_cooldowns = userCooldowns_ES(interaction.user, userData);

        return await interaction.editReply({ embeds: [embed_cooldowns] });
    }
};