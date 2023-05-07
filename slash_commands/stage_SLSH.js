const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { messageTools } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const { dateTools } = require('../modules/jsTools');
const Stage = require('../modules/stageLogic');
const userParser = require('../modules/userParser');

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
        let embed_stage = new messageTools.Embedinator(interaction, {
            title: "%USER | stage", author: interaction.user
        });

        // Check if the user has an active cooldown
        let userCooldownETA = await userManager.cooldowns.check(interaction.user.id, "stage");
        if (userCooldownETA) return embed_stage.send(`You can use stage again **${userCooldownETA}**.`);

        // Get interaction options
        let user_rival = interaction.options.getUser("player") || null;
        if (user_rival?.id === interaction.user.id) return await embed_stage.send(
            "You can't duel yourself!"
        );

        //! Player
        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Get the user's idol card from their card_inventory
        let card_idol = userParser.cards.get(userData.card_inventory, userData.card_selected_uid);
        if (!card_idol) return await embed_stage.send(
            "You don't have an idol set. Use **/set edit:idol** first."
        );

        //! Player Rival
        // Fetch the rival user from Mongo
        let userData_rival; if (user_rival) {
            userData_rival = await userManager.fetch(user_rival.id);
            if (!userData_rival) return await embed_stage.send(
                "That user hasn't started yet."
            );

            // Get the rival user's idol card from their card_inventory
            let card_idol_rival = userParser.cards.get(userData_rival.card_inventory, userData_rival.card_selected_uid);
            if (!card_idol_rival) return await embed_stage.send(
                "That user doesn't have an idol set. They must use **/set edit:idol** first."
            );
        }

        // Reset the user's cooldown
        await userManager.cooldowns.reset(interaction.user.id, "stage");

        //! Create the stage battle
        let stage = new Stage(interaction, user_rival, {
            card_player: card_idol,
            card_rival: user_rival ? user_rival : null,
            startDelay: dateTools.parseStr(botSettings.timeout.stage_start, "s"),
            turnDelay: dateTools.parseStr(botSettings.timeout.stage_turn)
        });

        // Send the embed
        await interaction.editReply({ embeds: [stage.embed] });

        //! Handle the resulting winner
        let winner = await stage.start();

        if (winner.user) {
            // Update the winning user's card_inventory with the added XP/levels in Mongo
            await userManager.cards.update(winner.user.id, winner.card);

            // Edit the embed's footer with information regarding the winning card
            stage.embed.data.footer.text = "%USERNAME's idol gained %XPxp %LEVELS"
                .replace("%USERNAME", winner.user.username)
                .replace("%XP", winner.cardXPGained)
                .replace("%LEVELS", winner.cardLevelsGained > 0 ? "and leveled up" : "");

            return await stage.update_embed();
        }

        // Fallback for if the winner isn't a player
        stage.embed.data.footer.text = "you lost";
        return await stage.update_embed();
    }
};