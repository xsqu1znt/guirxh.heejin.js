/** @typedef {"sell"|"setFavorite"|"setIdol"|"vault"} ModuleType */

/** @typedef options
 * @property {CommandInteraction} interaction
 * @property {Cards[]|Cards} cards
 * @property {Message} message */

// prettier-ignore
const {
	CommandInteraction, Message,
	StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRow
} = require("discord.js");

const { BetterEmbed, awaitConfirmation } = require("./discordTools");
const { error_ES, user_ES } = require("./embedStyles");
const { userManager } = require("./mongo");
const cardManager = require("./cardManager");
const _jsT = require("./jsTools");

const config = { bot: require("../configs/config_bot.json") };

class InventoryEditModule {
	#emojis = {
		moduleType: [
			config.bot.emojis.editModule_sell.NAME,
			config.bot.emojis.editModule_setFavorite.NAME,
			config.bot.emojis.editModule_setIdol.NAME,
			config.bot.emojis.editModule_vault.NAME
		]
	};

	async #validateCard(cards) {
		let card_uids = _jsT.isArray(cards).map(c => c?.uid);

		// prettier-ignore
		let exists = await userManager.inventory.exists(this.data.interaction.user.id, card_uids);

		// prettier-ignore
		// Check if the card exists in the user's card_inventory
		if (!exists) await error_ES.send({
			interaction: this.data.interaction,
			description: `${card_uids.length ? "Those cards are" : "That card is"} not in your inventory`,
			sendMethod: "channel"
		});

		return exists;
	}

	/** @param {options} options */
	constructor(options) {
		options = { interaction: null, message: null, cards: [], ...options };

		this.data = {
			interaction: options.interaction,
			message: options.message,
			cards: options.cards,
			selected: [],
			reactionCollector: null
		};

		this.embeds = {
			set: new BetterEmbed({ interaction: this.data.interaction, author: { text: "$USERNAME | set", iconURL: true } })
		};
	}

	/** @param {...ModuleType} moduleType  */
	async addModuleReactions(...moduleType) {
		// prettier-ignore
		for (let type of moduleType) switch (type) {
			case "sell": await this.data.message.react(config.bot.emojis.editModule_sell.EMOJI); break;

			case "setFavorite": await this.data.message.react(config.bot.emojis.editModule_setFavorite.EMOJI); break;

			case "setIdol": await this.data.message.react(config.bot.emojis.editModule_setIdol.EMOJI); break;

			case "vault": await this.data.message.react(config.bot.emojis.editModule_vault.EMOJI); break;
		}

		return this;
	}

	async #startReactionCollection() {
		if (this.data.reactionCollector || !this.data.message) {
			this.data.reactionCollector.resetTimer();
			return;
		}

		// Create the collector filter
		let filter = (reaction, user) => {
			return this.#emojis.moduleType.includes(reaction.emoji.name) && user.id === interaction.user.id;
		};

		/// Create the collector
		let collector = this.data.message.createReactionCollector({ filter, time: 60000 });
		this.data.reactionCollector = collector;

		/* - - - - - { Collector - COLLECT } - - - - - */
		collector.on("collect", async (reaction, user) => {
			// prettier-ignore
			switch (reaction.emoji.name) {
				case config.bot.emojis.editModule_sell.NAME: return await this.#sendSellModule();

				case config.bot.emojis.editModule_setFavorite.NAME: break;

				case config.bot.emojis.editModule_setIdol.NAME: break;

				case config.bot.emojis.editModule_vault.NAME: break;
			}
		});

		/* - - - - - { Collector - END } - - - - - */
		collector.on("end", collected => {
			console.log(`Collected ${collected.size} items`);
		});
	}

	async #sendSellModule() {
		// prettier-ignore
		// Create the embed :: { SELL MODULE }
		let embed_sellModule = new BetterEmbed({
			interaction, author: { text: "$USERNAME | 🥕 sell", iconURL: true },
			description: "Choose which cards you want to sell"
		});

		/* - - - - - { Create the Select Menu } - - - - - */
		let selectMenu_options = this.data.cards.map((c, idx) =>
			new StringSelectMenuOptionBuilder()
				.setValue(`card_${idx}`)
				// .setEmoji("🃏")
				.setLabel(`${c.emoji} ${c.single} [${c.group}] ${c.name}`)
				.setDescription(`UID: ${c.uid} :: GID: ${c.globalID} :: 🗣️ ${c.setID}`)
		);

		// Create the select menu builder
		let selectMenu = new StringSelectMenuBuilder()
			.setCustomId("test")
			.setPlaceholder("Select what you want to sell")
			.addOptions(...selectMenu_options)
			.setMaxValues(this.data.cards.length);

		// Create the action row builder
		let actionRow = new ActionRowBuilder().addComponents(selectMenu);

		// Send the embed with components
		await embed_sellModule.send({ components: actionRow });
	}

	async sell(cards = null) {
		cards ? _jsT.isArray(cards) : this.selected;
		if (!cards.length) return;

		/* - - - - - { Await Confirmation } - - - - - */
		let sellTotal = _jsT.sum(cards.map(c => c.sellPrice));

		// Parse the cards into strings
		let cards_f = cards.length > 10 ? null : cards.map(c => cardManager.toString.basic(c));

		// prettier-ignore
		// Wait for the user to confirm
		let confirmation = await awaitConfirmation({
			interaction, deleteOnConfirmation: false,
			description: cards_f
				? `**Are you sure you want to sell:**\n${cards_f.join("\n")}`
				: `**Are you sure you want to sell \`${cards.length}\` ${cards.length === 1 ? "card" : "cards"}?**`,
			footer: `you will get ${config.bot.emojis.currency_1.EMOJI} ${sellTotal}`
		});

		if (!confirmation) return;

		/* - - - - - { Sell the Cards } - - - - - */
		let { success } = await userManager.inventory.sell(interaction.user.id, cards);

		// prettier-ignore
		if (!success) return await error_ES.send({
            interaction, description: "Cannot sell cards that are not in your inventory",
            sendMethod: "channel"
		});

		// Create the embed :: { SELL }
		let embed_sell = user_ES.sell(interaction.member, cards, sellTotal);
		return await embed_sell.reply(this.data.message);
	}

	async setFavorite(card = null) {
		card ||= this.data.selected[0];
		if (!card) return;

		// Check if the card exists in the user's card_inventory
		if (!(await this.#validateCard(card))) return;

		// Fetch the user from Mongo
		let userData = await userManager.fetch(this.data.interaction.user.id, { type: "essential" });

		// prettier-ignore
		// Check if the card's already favorited
		if (card.uid === userData.card_favorite_uid) return await error_ES.send({
			interaction: this.data.interaction, description: `\`${card.uid}\` is already your \`⭐ favorite\``,
			sendMethod: "channel"
		});

		// Set the card as the user's favorite in Mongo
		await userManager.update(this.data.interaction.user.id, { card_favorite_uid: card.uid });

		/// Create the embed :: { SET FAVORITE }
		let card_f = cardManager.toString.basic(card);

		let embed_setFavorite = this.embeds.set({
			description: `Your \`⭐ favorite\` has been set to:\n> ${card_f}`,
			imageURL: card.imageURL
		});

		return await embed_setFavorite.send({ sendMethod: "channel" });
	}

	async setIdol(card = null) {
		card ||= this.data.selected[0];
		if (!card) return;

		// Check if the card exists in the user's card_inventory
		if (!(await this.#validateCard(card))) return;

		// Fetch the user from Mongo
		let userData = await userManager.fetch(this.data.interaction.user.id, { type: "essential" });

		// prettier-ignore
		// Check if the card's already selected
		if (card.uid === userData.card_selected_uid) return await error_ES.send({
			interaction: this.data.interaction, description: `\`${card.uid}\` is already your \`🏃 idol\``,
			sendMethod: "channel"
		});

		// Set the card as the user's selected in Mongo
		await userManager.update(this.data.interaction.user.id, { card_favorite_uid: card.uid });

		/// Create the embed :: { SET IDOL }
		let card_f = cardManager.toString.basic(card);

		let embed_setIdol = this.embeds.set({
			description: `Your \`🏃 idol\` has been set to:\n> ${card_f}`,
			imageURL: card.imageURL
		});

		return await embed_setIdol.send({ sendMethod: "channel" });
	}

	async vault(cards = null) {
		cards ? _jsT.isArray(cards) : this.selected;
		if (!cards.length) return;

		// Check if the card exists in the user's card_inventory
		if (!(await this.#validateCard(cards))) return;

		/// Check if the cards are already locked
		cards = cards.filter(c => !c.locked);

		// prettier-ignore
		if (!cards.length) return await error_ES.send({
			interaction, description: `${uids.length === 1 ? `That card is` : "Those cards are"} already in your \`🔒 vault\``
		});

		// Create the embed :: { SET VAULT }
		let embed_setVault = this.embeds.set({
			description: `\`${cards.length}\` ${cards.length === 1 ? "card" : "cards"} added to your \`🔒 vault\``
		});

		return await embed_setVault.send({ sendMethod: "channel" });
	}
}

module.exports = InventoryEditModule;
