const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { messageTools } = require('../modules/discordTools');
const { randomTools } = require('../modules/jsTools');
const { userManager } = require('../modules/mongo');
const cardManager = require('../modules/cardManager');
const userParser = require('../modules/userParser');

module.exports = {
    builder: new SlashCommandBuilder().setName("set")
        .setDescription("An arsenal of commands for the player to enchance their life")

        .addStringOption(option => option.setName("edit")
            .setDescription("Choose what you want to set")
            .addChoices(
                { name: "favorite", value: "favorite" },
                { name: "idol", value: "idol" },
                { name: "team", value: "team" }
            )
            .setRequired(true)
        )

        .addStringOption(option => option.setName("add")
            .setDescription("Add a card using its unique ID")
        )

        .addStringOption(option => option.setName("remove")
            .setDescription("Remove a card using its unique ID")
        )

        // /SET BIOGRAPHY
        /* .addSubcommand(subcommand => subcommand.setName("biography")
            .setDescription("Set your profile biography")

            .addStringOption(option => option.setName("text")
                .setDescription("What you want your biography to be | use \"reset\" to remove")
                .setRequired(true))
        ) */

        // /SET FAVORITE
        /* .addSubcommand(subcommand => subcommand.setName("favorite")
            .setDescription("Set a card as your favorite")

            .addStringOption(option => option.setName("uid")
                .setDescription("The unique ID of the card | use \"reset\" to unfavorite")
                .setRequired(true))
        ) */

        // /SET IDOL
        /* .addSubcommand(subcommand => subcommand.setName("idol")
            .setDescription("Set a card to level up using /stage")

            .addStringOption(option => option.setName("uid")
                .setDescription("The unique ID of the card | use \"reset\" to unset")
                .setRequired(true))
        ) */

        // /SET TEAM
        /* .addSubcommand(subcommand => subcommand.setName("team")
            .setDescription("Add/remove a card in your team | MAX 4 Cards")

            .addStringOption(option => option.setName("uid")
                .setDescription("The unique ID of the card | use the same UID to remove")
                .setRequired(true))
        ) */,

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Interaction options and stuff
        let uid_add = interaction.options.getString("add");
        let uid_remove = interaction.options.getString("remove");
        uid_add &&= uid_add.toLowerCase(); uid_remove &&= uid_remove.toLowerCase();

        let userData, card, card_f;

        // Create a base embed
        const embedinator = new messageTools.Embedinator(interaction, {
            title: "%USER | set", author: interaction.user
        });

        // Fallback
        if (!uid_add && !uid_remove)
            return await embedinator.send("You need to give a valid card ID.");

        // Determine the operation
        switch (interaction.options.getString("operation")) {
            case "favorite":
                if (uid_add) {
                    // Fetch the user from Mongo
                    userData = await userManager.fetch(interaction.user.id, "full", true);

                    // Get the card from the user's card_inventory
                    card = userParser.cards.get(userData.card_inventory, uid_add);
                    if (!card) return await embedinator.send(
                        `\`${uid_add}\` is not a valid card ID.`
                    );

                    // Check if the card is already favorited
                    if (card.uid === userData.card_favorite_uid) return await embedinator.send(
                        `\`${uid_add}\` is already favorited.`
                    );

                    // Update the user's card_favorite_uid in Mongo
                    await userManager.update(interaction.user.id, { card_favorite_uid: card.uid });

                    // Let the user know the result
                    card_f = cardManager.toString.basic(card);
                    return await embedinator.send(`Your favorite card has been set to:\n> ${card_f}`);
                }

                // Unfavorite the user's favorited card
                else if (uid_remove) {
                    await userManager.update(interaction.user.id, { card_favorite_uid: "" });

                    return await embedinator.send("You no longer have a favorited card.");
                }

            case "idol":
                if (uid_add) {
                    // Fetch the user from Mongo
                    userData = await userManager.fetch(interaction.user.id, "full", true);

                    // Get the card from the user's card_inventory
                    card = userParser.cards.get(userData.card_inventory, uid_add);
                    if (!card) return await embedinator.send(
                        `\`${uid_add}\` is not a valid card ID.`
                    );

                    // Check if the card is already selected
                    if (card.uid === userData.card_selected_uid) return await embedinator.send(
                        `\`${uid_add}\` is already selected.`
                    );

                    // Update the user's card_favorite_uid in Mongo
                    await userManager.update(interaction.user.id, { card_selected_uid: card.uid });

                    // Let the user know the result
                    card_f = cardManager.toString.basic(card);
                    return await embedinator.send(`Your idol has been set to:\n> ${card_f}`);
                }

                // Unfavorite the user's favorited card
                else if (uid_remove) {
                    await userManager.update(interaction.user.id, { card_selected_uid: "" });

                    return await embedinator.send("You no longer have an idol set.");
                }

            case "team":
                if (uid_add) {
                    // Fetch the user from Mongo
                    userData = await userManager.fetch(interaction.user.id, "full", true);

                    let teamCards = userParser.cards.getMultiple(userData.card_inventory, userData.card_team_uids, false);
                    let teamCards_valid = teamCards.filter(card => card);

                    // Check if the user's team is full
                    if (teamCards_valid.length >= 4) return await embedinator.send(
                        "Your team can only have a max of \`4\` cards."
                    );

                    // Get the card from the user's card_inventory
                    let card = userParser.cards.get(userData.card_inventory, uid_add);
                    if (!card) return await embedinator.send(`\`${uid_add}\` is not a valid card ID.`);

                    // Add the card's uid to the user's card_team_uids
                    // also check and remove invalid uids if they exist in the user's card_team_uids
                    if (teamCards_valid.length > 0) {
                        cards_team = teamCards_valid.map(card => card.uid);
                        cards_team.push(card.uid);

                        await userManager.update(interaction.user.id, { card_team_uids: cards_team });
                    } else // If not, just push the new card to the user's card_team_uids
                        await userManager.update(interaction.user.id, { $push: { card_team_uids: card.uid } });

                    // Let the user know the result
                    card_f = cardManager.toString.basic(card);
                    return await embedinator.send(`Card added to your team:\n> ${card_f}`);
                }

                // Unfavorite the user's favorited card
                else if (uid_remove) {
                    // Fetch the user from Mongo
                    userData = await userManager.fetch(interaction.user.id, "full", true);

                    // Get the card from the user's card_inventory
                    let card = userParser.cards.get(userData.card_inventory, uid_remove);
                    if (!card) return await embedinator.send(`\`${uid_remove}\` is not a valid card ID.`);

                    if (userData.card_team_uids.find(uid => uid === uid_remove)) {
                        // Remove the card's uid from the user's card_team_uids
                        await userManager.update(interaction.user.id, { $pull: { card_team_uids: card.uid } });

                        // Let the user know the result
                        card_f = cardManager.toString.basic(card);
                        return await embedinator.send(`Card removed from your team:\n> ${card_f}`);
                    } else {
                        return await embedinator.send(`\`${uid_remove}\` is not on your team.`);
                    }
                }
        }
    }
};