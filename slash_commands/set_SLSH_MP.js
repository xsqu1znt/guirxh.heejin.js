const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { BetterEmbed } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const cardManager = require('../modules/cardManager');
const userParser = require('../modules/userParser');

module.exports = {
    builder: new SlashCommandBuilder().setName("set")
        .setDescription("Add/remove a card from something")

        .addStringOption(option => option.setName("edit")
            .setDescription("Choose what you want to set")
            .addChoices(
                { name: "⭐ favorite", value: "favorite" },
                { name: "🏃 idol", value: "idol" },
                { name: "🔒 vault", value: "vault" },
                { name: "👯 team", value: "team" }
            )
            .setRequired(true)
        )

        .addStringOption(option => option.setName("add")
            .setDescription("Add a card using UID")
        )

        .addStringOption(option => option.setName("remove")
            .setDescription("Remove a card using UID")
        ),

    helpIcon: "🏃",

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Interaction options and stuff
        let uid_add = interaction.options.getString("add") || ""; uid_add &&= uid_add.replace(/ /g, "").split(",");
        let uid_remove = interaction.options.getString("remove") || ""; uid_remove &&= uid_remove.replace(/ /g, "").split(",");
        let userData, cards, cards_f;

        // Create a base embed
        let embed_set = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | set", user: interaction.member }
        });

        // Fallback
        if (!uid_add?.length > 0 && !uid_remove?.length > 0)
            return await embed_set.send({ description: "You need to give a valid card ID" });

        // Determine the operation type
        switch (interaction.options.getString("edit")) {
            case "favorite":
                if (uid_add[0]) {
                    // Fetch the user from Mongo
                    userData = await userManager.fetch(interaction.user.id, "full", true);

                    // Get the card from the user's card_inventory
                    cards = userParser.cards.get(userData.card_inventory, uid_add[0]);
                    if (!cards) return await embed_set.send({
                        description:
                            `\`${uid_add[0]}\` is not a valid UID`
                    });

                    // Check if the card is already favorited
                    if (cards.uid === userData.card_favorite_uid) return await embed_set.send({
                        description:
                            `\`${uid_add[0]}\` is already your \`⭐ favorite\``
                    });

                    // Update the user's card_favorite_uid in Mongo
                    await userManager.update(interaction.user.id, { card_favorite_uid: cards.uid });

                    // Let the user know the result
                    cards_f = cardManager.toString.basic(cards);
                    return await embed_set.send({ description: `Your \`⭐ favorite\` has been set to:\n> ${cards_f}` });
                }

                // Unfavorite the user's favorited card
                else if (uid_remove[0]) {
                    await userManager.update(interaction.user.id, { card_favorite_uid: "" });

                    return await embed_set.send({ description: "You successfully removed your \`⭐ favorite\`" });
                }

            case "idol":
                if (uid_add[0]) {
                    // Fetch the user from Mongo
                    userData = await userManager.fetch(interaction.user.id, "full", true);

                    // Get the card from the user's card_inventory
                    cards = userParser.cards.get(userData.card_inventory, uid_add[0]);
                    if (!cards) return await embed_set.send({
                        description:
                            `\`${uid_add[0]}\` is not a valid UID`
                    });

                    // Check if the card is already selected
                    if (cards.uid === userData.card_selected_uid) return await embed_set.send({
                        description:
                            `\`${uid_add[0]}\` is already your \`🏃 idol\``
                    });

                    // Update the user's card_favorite_uid in Mongo
                    await userManager.update(interaction.user.id, { card_selected_uid: cards.uid });

                    // Let the user know the result
                    cards_f = cardManager.toString.basic(cards);
                    return await embed_set.send({ description: `Your \`🏃 idol\` has been set to:\n> ${cards_f}` });
                }

                // Unfavorite the user's favorited card
                else if (uid_remove[0]) {
                    await userManager.update(interaction.user.id, { card_selected_uid: "" });

                    return await embed_set.send({ description: "You successfully removed your \`🏃 idol\`" });
                }

            case "vault":
                if (uid_add.length > 0) {
                    // Fetch the user from Mongo
                    userData = await userManager.fetch(interaction.user.id, "full", true);

                    // Get the card from the user's card_inventory
                    cards = uid_add.map(uid => userParser.cards.get(userData.card_inventory, uid));
                    cards = cards.filter(card => card);
                    if (!cards.length > 0) return await embed_set.send({
                        description:
                            `\`${uid_add.join(" ").trim()}\` is not a valid UID`
                    });

                    // Check if the card is already selected
                    cards = cards.filter(card => !card.locked);
                    if (!cards.length > 0) return await embed_set.send({
                        description:
                            `\`${uid_add.join(" ").trim()}\` is already in your \`🔒 vault\``
                    });

                    // Lock the cards
                    cards.forEach(card => card.locked = true);

                    // Update the cards in the user's inventory in Mongo
                    await Promise.all(cards.map(card => userManager.cards.update(interaction.user.id, card)));

                    // Let the user know the result
                    cards_f = cards.map(card => `> ${cardManager.toString.basic(card)}`);
                    return await embed_set.send({
                        description: `\`🔒 vault edit\` You successfully added:\n ${cards_f.join("\n")}`
                    });
                }

                // Unlock a card
                else if (uid_remove.length > 0) {
                    // Fetch the user from Mongo
                    userData = await userManager.fetch(interaction.user.id, "full", true);

                    // Get the card from the user's card_inventory
                    cards = uid_remove.map(uid => userParser.cards.get(userData.card_inventory, uid));
                    cards = cards.filter(card => card);
                    if (!cards.length > 0) return await embed_set.send({
                        description:
                            `\`${uid_remove.join(" ").trim()}\` is not a valid UID`
                    });

                    // Check if the card is already selected
                    cards = cards.filter(card => card.locked);
                    if (!cards.length > 0) return await embed_set.send({
                        description:
                            `\`${uid_remove.join(" ").trim()}\` is already NOT in your \`🔒 vault\``
                    });

                    // Unlock the cards
                    cards.forEach(card => card.locked = false);

                    // Update the cards in the user's inventory in Mongo
                    await Promise.all(cards.map(card => userManager.cards.update(interaction.user.id, card)));

                    // Let the user know the result
                    cards_f = cards.map(card => `> ${cardManager.toString.basic(card)}`);
                    return await embed_set.send({
                        description: `\`🔒 vault edit\` You successfully removed:\n ${cards_f.join("\n")}`
                    });
                }

            case "team":
                if (uid_add[0]) {
                    // Fetch the user from Mongo
                    userData = await userManager.fetch(interaction.user.id, "full", true);

                    let teamCards = userParser.cards.getTeam(userData);
                    let teamCards_valid = teamCards.filter(card => card);

                    // Check if the user's team is full
                    if (teamCards_valid.length >= 4) return await embed_set.send({
                        description:
                            "Your team can only have a max of \`👯 4\`"
                    });

                    // Get the card from the user's card_inventory
                    let card = userParser.cards.get(userData.card_inventory, uid_add[0]);
                    if (!card) return await embed_set.send({ description: `\`${uid_add[0]}\` is not a valid UID` });

                    // Add the card's uid to the user's card_team_uids
                    // also check and remove invalid uids if they exist in the user's card_team_uids
                    if (teamCards.length > teamCards_valid.length) await userManager.update(interaction.user.id, {
                        card_team_uids: teamCards_valid.map(card => card.uid)
                    });
                    else // If not, just push the new card to the user's card_team_uids
                        await userManager.update(interaction.user.id, { $push: { card_team_uids: card.uid } });

                    // Let the user know the result
                    cards_f = cardManager.toString.basic(card);
                    return await embed_set.send({ description: `\`👯 team edit\` You successfully added:\n> ${cards_f}` });
                }

                // Unfavorite the user's favorited card
                else if (uid_remove[0]) {
                    // Fetch the user from Mongo
                    userData = await userManager.fetch(interaction.user.id, "full", true);

                    // Get the card from the user's card_inventory
                    let card = userParser.cards.get(userData.card_inventory, uid_remove[0]);
                    if (!card) return await embed_set.send({ description: `\`${uid_remove[0]}\` is not a valid UID.` });

                    if (userData.card_team_uids.find(uid => uid === uid_remove[0])) {
                        // Remove the card's uid from the user's card_team_uids
                        await userManager.update(interaction.user.id, { $pull: { card_team_uids: card.uid } });

                        // Let the user know the result
                        cards_f = cardManager.toString.basic(card);
                        return await embed_set.send({ description: `\`👯 team edit\` You successfully removed:\n> ${cards_f}` });
                    } else {
                        return await embed_set.send({ description: `\`${uid_remove[0]}\` is not part of your \`👯 team\`` });
                    }
                }
        }
    }
};