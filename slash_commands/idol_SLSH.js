const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');
const userParser = require('../modules/userParser');
const { userView_ES } = require('../modules/embedStyles');

module.exports = {
    builder: new SlashCommandBuilder().setName("idol")
        .setDescription("View the card you have selected for /stage"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Get the card from the user's card_inventory
        let card = userParser.cards.get(userData.card_inventory, userData.card_selected_uid);

        // Check if the user has a valid card selected
        if (!userData.card_selected_uid || !card) {
            // Get the /set command ID
            let guildCommands = await interaction.guild.commands.fetch();
            let setCommandID = guildCommands.find(slash_commands => slash_commands.name === "set").id;

            return await interaction.editReply({
                content: `You don't have a card selected. Use </set:${setCommandID}> first.`
            });
        }

        // Create the embed
        let embed_view = userView_ES(interaction.user, userData, card, true);

        // Send the embed
        return await interaction.editReply({ embeds: [embed_view] });
    }
};