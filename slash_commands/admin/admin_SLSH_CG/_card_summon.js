const { Client, CommandInteraction } = require('discord.js');

const { BetterEmbed } = require('../../../modules/discordTools');
const { userManager } = require('../../../modules/mongo');
const cardManager = require('../../../modules/cardManager');
const _ = require("lodash");

module.exports = {
    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Interaction options
        let userID = interaction.options.getString("userid");
        let globalIDs = interaction.options.getString("gid").replace(/ /g, "").split(",");
        if (!Array.isArray(globalIDs)) globalIDs = [globalIDs];

        // Create a base embed        
        let embed_summon = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | summon", user: interaction.member }
        });

        // Check if the user exists in the database
        if (!await userManager.exists(userID)) return await embed_summon.send({
            description: "That user has not started yet"
        });

        // Fetch the cards from our collection
        let cards = globalIDs.map(globalID => cardManager.get.byGlobalID(globalID)).filter(card => card);
        if (!cards.length) return await embed_summon.send({
            description: "You need to give a valid card ID"
        });

        // Add the cards to the user's card_inventory
        await userManager.cards.add(userID, cards);

        /// Create and send the embeds
        let recipient = await client.users.fetch(userID);

        let card_last = cards.slice(-1)[0] || cards[0];
        let cards_f = cards.map(card => cardManager.toString.basic(card));

        // Create the DM embed
        let embed_dm = new BetterEmbed({
            title: { text: "\`📬\` You have a message!" },
            description: `You got a gift from **${interaction.user.username}**\n>>> ${cards_f.join("\n")}`,
            imageURL: card_last.imageURL,
            showTimestamp: true
        });

        return await Promise.all([
            // Let the user know the result
            embed_summon.send({
                description: `You summoned for user \`🆔 ${userID}\`\n>>> ${cards_f.join("\n")}`,
                imageURL: card_last.imageURL
            }),
            // Send a DM to the recipient
            recipient.send({ embeds: [embed_dm] })
        ]);
    }
};