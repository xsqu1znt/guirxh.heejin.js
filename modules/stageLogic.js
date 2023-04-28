const { CommandInteraction, User, EmbedBuilder } = require('discord.js');

const { botSettings, userSettings } = require('../configs/heejinSettings.json');
const { randomTools, asyncTools } = require('./jsTools');
const cardManager = require('./cardManager');
const logger = require('./logger');

class Stage {
    /** Create a new Stage battle instance
     * @param {CommandInteraction} interaction
     * @param {User} rival
     * @param {Card} card
     */
    constructor(interaction, rival, options = { card_player: null, card_rival: null, startDelay: 3000, turnDelay: 1000 }) {
        options = { card_player: null, card_rival: null, startDelay: 3000, turnDelay: 1000, ...options };

        this.interaction = interaction;
        this.rival = rival;
        this.delay = {
            start: options.startDelay,
            turn: options.turnDelay
        };

        this.card_home = options.card_player;
        this.card_home_startingHP = this.card_home.stats.reputation;

        this.card_away = options.card_rival; // TODO: random card/other player's card
        this.card_away_startingHP = this.card_away.stats.reputation;

        this.turn = 0;

        this.resolve = null;

        // Create the starting embed
        this.embed = new EmbedBuilder()
            .setAuthor({
                name: `${interaction.user.username} | stage`,
                iconURL: interaction.user.avatarURL({ dynamic: true })
            })

            .addFields(
                // The player's team
                { name: interaction.user.username, value: cardManager.toString.inventory(this.card_home) },

                // The rival's team
                { name: "Rival", value: cardManager.toString.inventory(this.card_away) }
            )

            .setFooter({ text: `battle starting in ${this.startDelay} ${this.startDelay === 1 ? "second" : "seconds"}...` })
            .setColor(botSettings.embedColor || null);
    }

    async start() {
        await this.start_countdown();

        // Update the embed's footer
        // this.embed.data.footer.text = ""; await this.update_embed();

        return new Promise((resolve, reject) => {
            this.resolve = resolve; this.attack_away();
        });
    }

    /** End the stage battle.
     * @param {"home" | "away"} winner
     */
    async end(winner) {
        let winner_data = {
            id: "",
            card: null,
            cardXPGained: 0,
            cardLevelsGained: 0
        };

        switch (winner) {
            case "home":
                winner_data.id = this.interaction.user.id;

                // Reset the card's HP (reputation)
                this.card_home.stats.reputation = this.card_home_startingHP;

                winner_data.card = this.card_home;
                break;

            case "away":
                // Reset the card's HP (reputation)
                this.card_away.stats.reputation = this.card_away_startingHP;

                winner_data.card = this.card_away;
                break;
        }

        // Apply a random amount of xp to the winning card
        let { xp: { card: { stage: xp_stage } } } = userSettings;
        let xp = randomTools.number(xp_stage.min, xp_stage.max);
        winner_data.card.stats.xp = xp;

        // Try leveling the card up
        winner_data.card = cardManager.tryLevelUp;

        return this.resolve(winner_data);
    }

    async start_countdown() {
        for (let i = this.delay.start; i > 0; i--) {
            await asyncTools.wait(1000); this.delay.start--;

            // Update the embed's footer
            this.embed.setFooter({
                text: `battle starting in ${this.delay.start} ${this.delay.start === 1 ? "second" : "seconds"}...`
            });

            await this.update_embed();
        }

        return null;
    }

    /** Update the embed the user sees. */
    async update_embed() {
        return await this.interaction.editReply({ embeds: [this.embed] })
            .catch(err => logger.error("/stage", "update_embed() failed", err));
    }

    /** Attack player's card. */
    async attack_home() {
        this.turn++;

        this.card_home = this.applyDamage(this.card_away, this.card_home);

        // Update the embed with the rival's new stats
        this.embed.data.fields[0].value = cardManager.toString.inventory(this.card_home);

        // Update the embed's footer
        this.embed.data.footer.text = `turn: ${this.turn}`;

        await this.update_embed();

        // Wait a turn
        await asyncTools.wait(this.delay.turn);

        // Attack the player if the rival still has HP (reputation)
        let { stats: { reputation: reputation_home } } = this.card_home;
        if (reputation_home > 0) return await this.attack_away();

        // End the stage battle if the rival's out of HP (reputation)
        return await this.end("away");
    }

    /** Attack the rival's card. */
    async attack_away() {
        this.turn++;

        this.card_away = this.applyDamage(this.card_home, this.card_away);

        // Update the embed with the rival's new stats
        this.embed.data.fields[1].value = cardManager.toString.inventory(this.card_away);

        // Update the embed's footer
        this.embed.data.footer.text = `turn: ${this.turn}`;

        await this.update_embed();

        // Wait a turn
        await asyncTools.wait(this.delay.turn);

        // Attack the player if the rival still has HP (reputation)
        let { stats: { reputation: reputation_away } } = this.card_away;
        if (reputation_away > 0) return await this.attack_home();

        // End the stage battle if the rival's out of HP (reputation)
        return await this.end("home");
    }

    /** Apply a random amount of damage to the receiving card based on the attacking card's ability. */
    async applyDamage(card_attacker, card_receiver) {
        // Destructure the needed card stats for cleaner code
        let { stats: { ability: ability_attacker } } = card_attacker;
        let { stats: { reputation: reputation_receiver } } = card_receiver;

        let attackPower = randomTools.number(ability_attacker / 2, ability_attacker);

        // Calculate the resulting HP (reputation)
        // clamping the number to prevent HP (reputation) from going below 0
        reputation_receiver = (reputation_receiver - attackPower) > 0
            ? reputation_receiver - attackPower
            : 0;

        // Apply the new HP (reputation)
        card_receiver.stats.reputation = reputation_receiver;

        // Return the updated cards
        return { attacker: card_attacker, receiver: reputation_receiver };
    }
}