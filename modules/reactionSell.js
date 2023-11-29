const { CommandInteraction } = require("discord.js");

const { BetterEmbed, awaitConfirmation } = require("./discordTools");
const { error_ES } = require("./embedStyles");
const { userManager } = require("./mongo");
const _jsT = require("./jsTools");

const config = { bot: require("../configs/config_bot.json") };

class ReactionSellModule {
	#emojis = { numbers: config.bot.emojis.numbers, confirm: config.bot.emojis.confirm_sell };

	constructor(interaction, message, cards) {
		this.cards = cards;
		this.selected = [];
	}

	async addReactions() {
		for (let i = 0; i < this.cards.length; i++) {
			let _emoji = emoji_numbers[i]?.EMOJI;
			// Add a reaction to the message
			if (_emoji) await message.react(_emoji);
		}
	}

	// async #collectReactions() {}

    async #sell() {
        if (!this.selected.length) return;
    }
}

module.exports = ReactionSellModule;
