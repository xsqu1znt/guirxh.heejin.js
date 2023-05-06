const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { messageTools } = require('../modules/discordTools');
const { randomTools } = require('../modules/jsTools');
const { userManager } = require('../modules/mongo');
const cardManager = require('../modules/cardManager');
const userParser = require('../modules/userParser');

module.exports = {
    builder: new SlashCommandBuilder().setName("set")
        .setDescription("Add/remove a card from something")

        .addStringOption(option => option.setName("edit")
            .setDescription("Choose what you want to set")
            .addChoices(
                { name: "Favorite", value: "favorite" },
                { name: "Idol", value: "idol" },
                { name: "Vault", value: "vault" },
                { name: "Team", value: "team" }
            )
            .setRequired(true)
        )

        .addStringOption(option => option.setName("add")
            .setDescription("Add a card using its unique ID | separate multiple by comma")
        )

        .addStringOption(option => option.setName("remove")
            .setDescription("Remove a card using its unique ID | separate multiple by comma")
        ),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Interaction options and stuff
        let uid_add = interaction.options.getString("add"); uid_add &&= uid_add.replace(/ /g, "").split(",");
        let uid_remove = interaction.options.getString("remove"); uid_remove &&= uid_remove.replace(/ /g, "").split(",");
        let userData, cards, cards_f;

        // Create a base embed
        const embedinator = new messageTools.Embedinator(interaction, {
            title: "%USER | set", author: interaction.user
        });

        // Fallback
        if (!uid_add.length > 0 && !uid_remove.length > 0)
            return await embedinator.send("You need to give a valid card ID.");

        // Determine the operation type
        switch (interaction.options.getString("edit")) {
            case "favorite":
                if (uid_add[0]) {
                    // Fetch the user from Mongo
                    userData = await userManager.fetch(interaction.user.id, "full", true);

                    // Get the card from the user's card_inventory
                    cards = userParser.cards.get(userData.card_inventory, uid_add[0]);
                    if (!cards) return await embedinator.send(
                        `\`${uid_add[0]}\` is not a valid card ID.`
                    );

                    // Check if the card is already favorited
                    if (cards.uid === userData.card_favorite_uid) return await embedinator.send(
                        `\`${uid_add[0]}\` is already favorited.`
                    );

                    // Update the user's card_favorite_uid in Mongo
                    await userManager.update(interaction.user.id, { card_favorite_uid: cards.uid });

                    // Let the user know the result
                    cards_f = cardManager.toString.basic(cards);
                    return await embedinator.send(`Your favorite card has been set to:\n> ${cards_f}`);
                }

                // Unfavorite the user's favorited card
                else if (uid_remove[0]) {
                    await userManager.update(interaction.user.id, { card_favorite_uid: "" });

                    return await embedinator.send("You no longer have a favorited card.");
                }

            case "idol":
                if (uid_add[0]) {
                    // Fetch the user from Mongo
                    userData = await userManager.fetch(interaction.user.id, "full", true);

                    // Get the card from the user's card_inventory
                    cards = userParser.cards.get(userData.card_inventory, uid_add[0]);
                    if (!cards) return await embedinator.send(
                        `\`${uid_add[0]}\` is not a valid card ID.`
                    );

                    // Check if the card is already selected
                    if (cards.uid === userData.card_selected_uid) return await embedinator.send(
                        `\`${uid_add[0]}\` is already selected.`
                    );

                    // Update the user's card_favorite_uid in Mongo
                    await userManager.update(interaction.user.id, { card_selected_uid: cards.uid });

                    // Let the user know the result
                    cards_f = cardManager.toString.basic(cards);
                    return await embedinator.send(`Your idol has been set to:\n> ${cards_f}`);
                }

                // Unfavorite the user's favorited card
                else if (uid_remove[0]) {
                    await userManager.update(interaction.user.id, { card_selected_uid: "" });

                    return await embedinator.send("You no longer have an idol set.");
                }

            case "vault":
                if (uid_add.length > 0) {
                    // Fetch the user from Mongo
                    userData = await userManager.fetch(interaction.user.id, "full", true);

                    // Get the card from the user's card_inventory
                    cards = uid_add.map(uid => userParser.cards.get(userData.card_inventory, uid));
                    if (!cards.length > 0) return await embedinator.send(
                        `\`${uid_add.join(" ").trim()}\` is not a valid card ID.`
                    );

                    // Check if the card is already selected
                    cards = cards.filter(card => !card.locked);
                    if (!cards.length > 0) return await embedinator.send(
                        `\`${uid_add.join(" ").trim()}\` is already locked.`
                    );

                    // Lock the cards
                    cards.forEach(card => card.locked = true);

                    // Update the card in the user's inventory in Mongo
                    await userManager.cards.update(interaction.user.id, cards);

                    // Let the user know the result
                    cards_f = cards.map(card => `> ${cardManager.toString.basic(card)}`);
                    return await embedinator.send(`You added a card to your vault:\n${cards_f.join("\n")}`);
                }

                // Unlock a card
                else if (uid_remove > 0) {
                    // Fetch the user from Mongo
                    userData = await userManager.fetch(interaction.user.id, "full", true);

                    // Get the card from the user's card_inventory
                    cards = uid_remove.map(uid => userParser.cards.get(userData.card_inventory, uid));
                    if (!cards.length > 0) return await embedinator.send(
                        `\`${uid_remove.join(" ").trim()}\` is not a valid card ID.`
                    );

                    // Check if the card is already selected
                    cards = cards.filter(card => card.locked);
                    if (!cards.length > 0) return await embedinator.send(
                        `\`${uid_remove.join(" ").trim()}\` is already unlocked.`
                    );

                    // Unlock the card
                    cards.forEach(card => card.locked = false);

                    // Update the card in the user's inventory in Mongo
                    await userManager.cards.update(interaction.user.id, cards);

                    // Let the user know the result
                    cards_f = cards.map(card => `> ${cardManager.toString.basic(card)}`);
                    return await embedinator.send(`You removed a card from your vault:\n> ${cards_f.join("\n")}`);
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
                    cards_f = cardManager.toString.basic(card);
                    return await embedinator.send(`Card added to your team:\n> ${cards_f}`);
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
                        cards_f = cardManager.toString.basic(card);
                        return await embedinator.send(`Card removed from your team:\n> ${cards_f}`);
                    } else {
                        return await embedinator.send(`\`${uid_remove}\` is not on your team.`);
                    }
                }
        }
    }
};