/** @typedef {"sell"|"setFavorite"|"setIdol"|"vault"} ModuleType */

/** @typedef options
 * @property {CommandInteraction} interaction
 * @property {Cards[]|Cards} cards
 * @property {Message} message */

const { CommandInteraction, Message } = require("discord.js");

const { BetterEmbed, awaitConfirmation } = require("./discordTools");
const { error_ES, user_ES } = require("./embedStyles");
const { userManager } = require("./mongo");
const _jsT = require("./jsTools");

const config = { bot: require("../configs/config_bot.json") };

class InventoryEditModule {
	#emojis = {
		numbers: config.bot.emojis.numbers,
		confirm: config.bot.emojis.confirm_sell
	};

	/** @param {options} options */
	constructor(options) {
		options = { interaction: null, message: null, cards: [], ...options };

		this.data = {
			interaction: options.interaction,
			message: options.message,
			cards: options.cards,
			selected: []
		};
	}

	/** @param {...ModuleType} moduleType  */
	async addModuleReactions(...moduleType) {
		// prettier-ignore
		for (let type of moduleType) switch (type) {
			case "sell": await this.message.react(config.bot.emojis.editModule_sell.EMOJI); break;

			case "setFavorite": await this.message.react(config.bot.emojis.editModule_setFavorite.EMOJI); break;

			case "setIdol": await this.message.react(config.bot.emojis.editModule_setIdol.EMOJI); break;

			case "vault": await this.message.react(config.bot.emojis.editModule_setVault.EMOJI); break;
		}

		return this;
	}

	async #sell() {
		if (!this.selected.length) return;

		// Try selling the cards
		let { success, sellTotal } = await userManager.inventory.sell(interaction.user.id, this.data.selected);

		// prettier-ignore
		if (!success) return await error_ES.send({
            interaction, description: "Cannot sell cards that are not in your inventory",
            sendMethod: "channel"
        });

		// Create the embed :: { SELL }
		let embed_sell = user_ES.sell(interaction.member, this.data.selected, sellTotal);
		return await embed_sell.reply(this.data.message);
	}
}

module.exports = ReactionSellModule;
