const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { userManager } = require('../modules/mongo');
const { userGift_ES } = require('../modules/embedStyles');
const { BetterEmbed } = require('../modules/discordTools');
const userParser = require('../modules/userParser');

module.exports = {
    builder: new SlashCommandBuilder().setName("gift")
        .setDescription("Give a card to another player")

        .addStringOption(option => option.setName("uid")
            .setDescription("UID of the card separate by comma (MAX 5)")
            .setRequired(true))

        .addUserOption(option => option.setName("player")
            .setDescription("The player you want to gift to")
            .setRequired(true)),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_error = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | gift", user: interaction.member }
        });

        // Interaction options
        let uids = interaction.options.getString("uid").replace(/ /g, "").split(",");
        if (!Array.isArray(uids)) uids = [uids];

        // A player can only gift 5 cards at once to perserve embed size
        if (uids.length > 5) return await embed_error.send({
            description: "You cannot gift more than \`🃏 5\` at once"
        });

        let recipient = interaction.options.getUser("player");

        // A player can't gift cards to themselves
        if (recipient.id === interaction.user.id) return await embed_error.send({
            description: "You cannot gift to yourself, silly!"
        });

        // Check if the recipient player started
        if (!await userManager.exists(recipient.id)) return await embed_error.send({
            description: "That user has not started yet"
        });

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Get the cards from the user's card_inventory
        let cards = userParser.cards.get(userData, uids);
        if (!cards.length) return await embed_error.send({
            description: `You need to give a valid UID`
        });

        // Filter out locked and favorited cards
        cards = cards.filter(card => card.uid !== userData.card_favorite_uid && !card?.locked);
        if (!cards.length) return await embed_error.send({
            description: "\`%UIDS\` cannot be gifted, it is either:\n\`🔒 vault\` \`🧑🏾‍🤝‍🧑 team\` \`🏃 idol\` \`⭐ favorite\`"
                .replace("%UIDS", uids.join(" ").trim())
        });

        // Update the users' card_inventory in Mongo
        await Promise.all([
            // Add the card to the recipient player's card_inventory
            userManager.cards.add(recipient.id, cards),
            // Remove the card from the gifting player's card_inventory
            userManager.cards.remove(interaction.user.id, cards.map(card => card.uid))
        ]);

        // Create the embeds
        let { embed_gift, embed_dm } = userGift_ES(interaction.user, recipient, cards);

        return await Promise.all([
            // Let the user know the result
            interaction.editReply({ embeds: [embed_gift] }),
            // Send a DM to the recipient
            recipient.send({ embeds: [embed_dm] })
        ]);
    }
};