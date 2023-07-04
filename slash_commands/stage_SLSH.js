const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const {
    botSettings,
    userSettings: { xp: { commands: { stage: xp_stage } } }
} = require('../configs/heejinSettings.json');
const { randomTools, dateTools } = require('../modules/jsTools');
const { BetterEmbed } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const userParser = require('../modules/userParser');
const Stage = require('../modules/stageLogic');

module.exports = {
    options: { icon: "🎤", deferReply: true },

    builder: new SlashCommandBuilder().setName("stage")
        .setDescription("LV. your idol by challenging a rival to a duel")

        .addUserOption(option => option.setName("player")
            .setDescription("Challenge a player to a duel")),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_error = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | stage", user: interaction.member }
        });

        // Check if the user has an active cooldown
        let userCooldownETA = await userManager.cooldowns.check(interaction.user.id, "stage");
        if (userCooldownETA) return await embed_error.send({ description: `You can use stage again **${userCooldownETA}**` });

        // Get interaction options
        let user_rival = interaction.options.getUser("player") || null;
        if (user_rival?.id === interaction.user.id) return await embed_error.send({
            description: "You cannot duel yourself, silly!"
        });

        //! Player
        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "full", true);

        // Get the user's idol card from their card_inventory
        let card_idol = userParser.cards.get(userData.card_inventory, userData.card_selected_uid);
        if (!card_idol) return await embed_error.send({
            description: "You do not have \`🏃 idol\`\nUse \`/set edit: 🏃 idol add: UID\`"
        });

        //! Player Rival
        // Fetch the rival user from Mongo
        let userData_rival, card_idol_rival; if (user_rival) {
            userData_rival = await userManager.fetch(user_rival.id);
            if (!userData_rival) return await embed_error.send({
                description: "That user has not started yet"
            });

            // Get the rival user's idol card from their card_inventory
            card_idol_rival = userParser.cards.get(userData_rival.card_inventory, userData_rival.card_selected_uid);
            if (!card_idol_rival) return await embed_error.send({
                description: "That user does not have \`🏃 idol\`\nUse \`/set edit: 🏃 idol add: UID\`"
            });
        }

        // Reset the user's cooldown
        await userManager.cooldowns.reset(interaction.user.id, "stage");

        // Add a reminder for the user
        // Reset the user's reminder
        await userManager.reminders.reset(
            interaction.user.id, interaction.guild.id, interaction.channel.id,
            interaction.user, "stage"
        );

        //! Create the stage battle
        let stage = new Stage(interaction, user_rival, {
            card_player: card_idol,
            card_rival: card_idol_rival ? card_idol_rival : null,
            startDelay: dateTools.parseStr(botSettings.timeout.stage_start, "s"),
            turnDelay: dateTools.parseStr(botSettings.timeout.stage_turn)
        });

        // Send the embed
        await interaction.editReply({ embeds: [stage.embed] });

        //! Handle the resulting winner
        let winner = await stage.start();

        if (winner.user) {
            await Promise.all([
                // Update the winning user's card_inventory with the added XP/levels in Mongo
                userManager.cards.update(winner.user.id, winner.card),
                // Give the user XP
                userManager.xp.add(winner.user.id, randomTools.number(xp_stage.min, xp_stage.max))
            ]);

            // Edit the embed's footer with information regarding the winning card
            stage.embed.data.footer.text = "%USERNAME's idol gained %XPxp %LEVELS"
                .replace("%USERNAME", winner.user.username)
                .replace("%XP", winner.cardXPGained)
                .replace("%LEVELS", winner.cardLevelsGained > 0 ? "and gained a LV." : "");

            return await stage.update_embed();
        }

        // Fallback for if the winner isn't a player
        stage.embed.data.footer.text = "You lost.. try again next time!";
        return await stage.update_embed();
    }
};