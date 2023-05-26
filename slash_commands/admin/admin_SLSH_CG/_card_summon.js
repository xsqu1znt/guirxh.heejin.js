const { Client, CommandInteraction, EmbedBuilder } = require('discord.js');

const { botSettings: { embed: { color: embedColor } } } = require('../../../configs/heejinSettings.json');
const { userManager } = require('../../../modules/mongo');
const cardManager = require('../../../modules/cardManager');

module.exports = {
    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Interaction options
        let userID = interaction.options.getString("userid");
        let globalID = interaction.options.getString("gid");

        // Base embed
        let embed_summon = new EmbedBuilder()
            .setAuthor({ name: `${interaction.user.username} | summon` })
            .setDescription("You need to give a valid card ID")
            .setColor(embedColor || null);

        // Check if the user exists in the database
        if (!await userManager.exists(userID)) {
            embed_summon.setDescription("That user has not started yet");

            return await interaction.editReply({ embeds: [embed_summon] });
        }

        // Fetch the card from our collection
        let card = cardManager.get.byGlobalID(globalID);
        if (!card) return await interaction.editReply({ embeds: [embed_summon] });

        // Give the card to the user
        card = (await userManager.cards.add(userID, card, true))[0];

        // Let the user know the result
        let card_f = cardManager.toString.basic(card);
        embed_summon.setDescription(`You summoned a card for user \`🆔 ${userID}\`:\n> ${card_f}`);

        return await interaction.editReply({ embeds: [embed_summon] });
    }
};