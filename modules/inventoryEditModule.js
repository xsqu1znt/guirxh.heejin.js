/** @typedef options
 * @property {CommandInteraction} interaction
 * @property {Cards[]|Cards} cards
 * @property {InventoryEditType} type
 */

const { CommandInteraction } = require("discord.js");

const { BetterEmbed, awaitConfirmation } = require("./discordTools");
const { error_ES } = require("./embedStyles");
const { userManager } = require("./mongo");
const _jsT = require("./jsTools");

const config = { bot: require("../configs/config_bot.json") };

class InventoryEditModule {
	#emojis = {
		numbers: config.bot.emojis.numbers,
		confirm: config.bot.emojis.confirm_sell
	};

	constructor(options) {
		this.cards = cards;
		this.selected = [];
	}

	async #sell() {
		if (!this.selected.length) return;

		// Try selling the cards
		let { success, amount } = await userManager.inventory.sell(interaction.user.id, this.selected);

		// prettier-ignore
		if (!success) return await error_ES.send({
            interaction, description: "Cannot sell cards that are not in your inventory",
            sendMethod: "channel"
        });

		/* - - - - - { Create the Embed } - - - - - */
		let embed_sell = new BetterEmbed({
			interaction,
			author: { text: "" }
		});
	}
}

module.exports = ReactionSellModule;
