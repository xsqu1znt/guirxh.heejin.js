const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { userManager } = require('../modules/mongo');
const { messageTools } = require('../modules/discordTools');
const { userTeamView_ES } = require('../modules/embedStyles');
const { dateTools } = require('../modules/jsTools');
const cardManager = require('../modules/cardManager');
const userParser = require('../modules/userParser');

module.exports = {
    builder: new SlashCommandBuilder().setName("team")
        .setDescription("Edit your team")

        .addSubcommand(subcommand => subcommand.setName("view")
            .setDescription("View your team"))

        .addSubcommand(subcommand => subcommand.setName("add")
            .setDescription("Add a card to your team (MAX 4)")
            .addStringOption(option => option.setName("uid")
                .setDescription("The unique ID of the card")
                .setRequired(true)))

        .addSubcommand(subcommand => subcommand.setName("remove")
            .setDescription("Remove a card from your team")
            .addStringOption(option => option.setName("uid")
                .setDescription("The unique ID of the card")
                .setRequired(true))),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Get interation options
        let uid = interaction.options.getString("uid");

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Handles the /TEAM VIEW request
        if (interaction.options.getSubcommand() === "view") {
            // Build the user's inventory pages
            let embed_teamPages = userTeamView_ES(interaction.user, userData);

            // Paginatation-ify-inator 9000!!!!11
            return await messageTools.paginationify(interaction, embed_teamPages, {
                timeout: dateTools.parseStr(botSettings.timeout.pagination)
            });
        }

        // Get the card from the user's card_inventory
        let card = userParser.cards.get(userData.card_inventory, uid);
        if (!card) return await interaction.editReply({ content: `\`${uid}\` is not a valid card ID.` });

        // Parse the card into a human readable format
        let card_f = cardManager.toString.basic(card);

        // Determine the operation type
        switch (interaction.options.getSubcommand()) {
            case "add":
                // Don't allow duplicate card entries
                if (userData.card_team_uids.find(uid => uid === card.uid)) return await interaction.editReply({
                    content: `\`${card.uid}\` is already on your team.`
                });

                // Check if the user's team is full
                let cards_team = userParser.cards.getMultiple(userData.card_inventory, userData.card_team_uids, false);
                if (cards_team.filter(card => card).length >= 4) return await interaction.editReply({
                    content: "Your team can only have a max of \`4\` cards."
                });

                // Add the card's uid to the user's card_team_uids
                // also check and remove invalid uids if they exist in the user's card_team_uids
                if (cards_team.filter(card => !card).length > 0) {
                    cards_team = cards_team.filter(card => card);
                    cards_team.push(card.uid);

                    await userManager.update(interaction.user.id, { card_team_uids: cards_team });
                } else // If not, just push the new card to the user's card_team_uids
                    await userManager.update(interaction.user.id, { $push: { card_team_uids: card.uid } });

                // Let the user know the result
                return await interaction.editReply({ content: `Added ${card_f} to your team.` });

            case "remove":
                // Remove the card's uid from the user's card_team_uids
                await userManager.update(interaction.user.id, { $pull: { card_team_uids: card.uid } });

                // Let the user know the result
                return await interaction.editReply({ content: `Removed ${card_f} from your team.` });
        }
    }
};