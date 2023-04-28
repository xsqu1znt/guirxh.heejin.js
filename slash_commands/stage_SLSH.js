const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { messageTools } = require('../modules/discordTools');
const Stage = require('../modules/stageLogic');
const userParser = require('../modules/userParser');
const { userManager } = require('../modules/mongo');

module.exports = {
    builder: new SlashCommandBuilder().setName("stage")
        .setDescription("Level up your idol by challenging the best to a duel")

        .addUserOption(option => option.setName("player")
            .setDescription("Challenge a player to a duel")),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Reusable embedinator to send success/error messages
        const embedinator = new messageTools.Embedinator(interaction, {
            title: "%USER | stage", author: interaction.user
        });

        // Get interaction options
        let user_rival = interaction.options.getUser("player");
        if (user_rival.id === interaction.user.id) return await embedinator.send(
            "You can't duel yourself!"
        );

        //! Player

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Get the user's idol card from their card_inventory
        let card_idol = userParser.cards.get(userData.card_inventory, userData.card_selected_uid);
        if (!card_idol) return await embedinator.send(
            "You don't have an idol set. Use **/idol set** first."
        );

        //! Player Rival

        // Fetch the rival user from Mongo
        let userData_rival; if (user_rival) {
            userData_rival = await userManager.fetch(user_rival.id);
            if (!userData_rival) return await embedinator.send(
                "That user hasn't started yet."
            );

            // Get the rival user's idol card from their card_inventory
            let card_idol_rival = userParser.cards.get(userData_rival.card_inventory, userData_rival.card_selected_uid);
            if (!card_idol_rival) return await embedinator.send(
                "That user doesn't have an idol set. They must use **/idol set** first."
            );
        }

        // ! Create the stage battle
        let stage = new Stage(interaction, user_rival, {
            card_player: card_idol,
            card_rival: user_rival ? user_rival : null,
            startDelay: 3, turnDelay: 1
        });

        // Send the embed
        return await interaction.editReply({ embeds: [stage.embed] });
    }
};