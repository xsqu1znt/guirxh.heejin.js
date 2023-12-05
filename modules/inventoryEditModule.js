/** @typedef {"sell"|"setFavorite"|"setIdol"|"vault"} ModuleType */

/** @typedef options
 * @property {Client} client
 * @property {CommandInteraction} interaction
 * @property {Cards[]|Cards} cards
 * @property {Message} message */

// prettier-ignore
const {
	CommandInteraction, Message,
	ReactionCollector, InteractionCollector,
	StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, Client
} = require("discord.js");

const { BetterEmbed, awaitConfirmation } = require("./discordTools");
const { error_ES, user_ES } = require("./embedStyles");
const { userManager } = require("./mongo");
const cardManager = require("./cardManager");
const _jsT = require("./jsTools");

const config = { bot: require("../configs/config_bot.json") };

const ModuleType = { inactive: 0, sell: 1, setFavorite: 2, setIdol: 3, vault: 4 };

const moduleTypeEmojis = {
	sell: config.bot.emojis.inventoryModule_sell,
	setFavorite: config.bot.emojis.inventoryModule_setFavorite,
	setIdol: config.bot.emojis.inventoryModule_setIdol,
	vault: config.bot.emojis.inventoryModule_vault,

	names: [
		config.bot.emojis.inventoryModule_sell.NAME,
		config.bot.emojis.inventoryModule_setFavorite.NAME,
		config.bot.emojis.inventoryModule_setIdol.NAME,
		config.bot.emojis.inventoryModule_vault.NAME
	]
};

class InventoryEditModule {
	async #validateSelectedCards(cards = null || this.cards_selected) {
		// prettier-ignore
		let uids = _jsT.isArray(cards).map(c => c?.uid).filter(uid => uid);

		// Check if the cards exists in the user's card_inventory
		let has = await userManager.inventory.has(this.data.interaction.user.id, { uids });

		// Filter out cards not found
		cards = cards.filter((c, idx) => has[idx]);

		// prettier-ignore
		// Send an embed error message if the user doesn't have the required cards
		if (!cards.length) await error_ES.send({
			interaction: this.data.interaction,
			description: `${uids.length ? "Those cards are" : "That card is"} not in your inventory`,
			sendMethod: "channel"
		});

		return cards.length ? cards : false;
	}

	async #collectReactions() {
		if (this.data.collectors.reaction) {
			this.data.collectors.reaction.resetTimer();
			return;
		}

		// Create the collection filter
		let filter = (reaction, user) => {
			// Remove other user's reactions
			if (![this.data.client.user.id, this.data.interaction.user.id].includes(user.id)) reaction.users.remove(user.id);
			// Check if the reaction was relevant to this module
			return moduleTypeEmojis.names.includes(reaction.emoji.name);
		};

		// prettier-ignore
		// Create the collector
		this.data.collectors.reaction = this.data.message.createReactionCollector({
			filter, idle: this.data.timeouts.moduleReactions, dispose: true
		});

		/* - - - - - { Collector - COLLECT } - - - - - */
		this.data.collectors.reaction.on("collect", async (reaction, user) => {
			// prettier-ignore
			switch (reaction.emoji.name) {
				case moduleTypeEmojis.sell.NAME: return await this.#sendEmbed_sell(reaction);

				case moduleTypeEmojis.setFavorite.NAME: break;

				case moduleTypeEmojis.setIdol.NAME: break;

				case moduleTypeEmojis.vault.NAME: break;
			}
		});

		/* - - - - - { Collector - REMOVE } - - - - - */
		this.data.collectors.reaction.on("remove", async (reaction, user) => {
			// prettier-ignore
			switch (reaction.emoji.name) {
				case moduleTypeEmojis.sell.NAME:
					if (!this.data.sent.sell.canDelete) return;

					try {
						this.data.sent.sell.message = null;
						this.data.sent.sell.canDelete = false;
						this.data.sent.sell.reactionRemove = null;
						return await this.data.sent.sell.message.delete();
					} catch { return; }

				case moduleTypeEmojis.setFavorite.NAME: break;

				case moduleTypeEmojis.setIdol.NAME: break;

				case moduleTypeEmojis.vault.NAME: break;
			}
		});

		/* - - - - - { Collector - END } - - - - - */
		this.data.collectors.reaction.on("end", collected => {
			this.data.collectors.reaction = null;
		});
	}

	/** @param {Message} message  */
	async #collectSelectMenu(message) {
		if (this.data.collectors.selectMenu) {
			this.data.collectors.selectMenu.resetTimer();
			return;
		}

		// Create the collection filter
		let filter = i => {
			return i.user.id === this.data.interaction.user.id;
		};

		// Create the collector
		this.data.collectors.selectMenu = message.createMessageComponentCollector({ filter, idle: 30000 });

		/* - - - - - { Collector - COLLECT } - - - - - */
		this.data.collectors.selectMenu.on("collect", async i => {
			if (i.customId !== "ssm_cardSelect") return;

			// Get the indexes of the selected cards
			// this is assuming select menu option values have a format of "card_1" and so on
			let card_idxs = i.values.map(val => Number(val.split("_")[1]));

			// Add the selected cards to the array
			this.cards_selected = card_idxs.map(idx => this.cards[idx]);

			// prettier-ignore
			// Trigger the next action
			switch (this.data.activeModule) {
				case ModuleType.sell: return await this.sell();

				case ModuleType.setFavorite: return;

				case ModuleType.setIdol: return;

				case ModuleType.vault: return;

				default: return;
			}
		});

		/* - - - - - { Collector - END } - - - - - */
		this.data.collectors.selectMenu.on("end", collected => {
			this.data.collectors.selectMenu = null;
		});
	}

	/** @param {Client} client @param {CommandInteraction} interaction @param {Message} message @param {options} options */
	constructor(client, interaction, message, options) {
		options = { cards: [], ...options };

		/* - - - - - { Variables } - - - - - */
		this.cards = options.cards;
		this.cards_selected = [];

		this.data = {
			client: client,
			interaction: interaction,
			message: message,

			activeModule: ModuleType.inactive,

			timeouts: {
				moduleReactions: _jsT.parseTime(config.bot.timeouts.INVENTORY_MODULE_REACTIONS),
				cardSelect: _jsT.parseTime(config.bot.timeouts.INVENTORY_MODULE_CARD_SELECT)
			},

			sent: {
				sell: { message: null, canDelete: false, reactionRemove: null }
			},

			collectors: {
				/** @type {ReactionCollector} */
				reaction: null,
				/** @type {InteractionCollector} */
				selectMenu: null
			},

			// messages: { sellModule: { msg: null, canDelete: false } },
			// interactions: { sellModule: null },
			// prettier-ignore

			/* - - - - - { Embeds } - - - - - */
			embeds: {
				set: new BetterEmbed({ interaction: this.data.interaction, author: { text: "$USERNAME | set", iconURL: true } })
			}
		};
	}

	/** @param {...ModuleType} moduleType */
	async addModuleReactions(...moduleType) {
		this.#collectReactions();

		// prettier-ignore
		for (let type of moduleType) switch (type) {
			case "sell": await this.data.message.react(moduleTypeEmojis.sell.EMOJI); break;

			case "setFavorite": await this.data.message.react(moduleTypeEmojis.setFavorite.EMOJI); break;

			case "setIdol": await this.data.message.react(moduleTypeEmojis.setIdol.EMOJI); break;

			case "vault": await this.data.message.react(moduleTypeEmojis.vault.EMOJI); break;

			default: continue;
		}
	}

	async #sendEmbed_sell(reaction = null) {
		// prettier-ignore
		// Create the embed :: { SELL MODULE }
		let embed_sellModule = new BetterEmbed({
			interaction: this.data.interaction, author: { text: "$USERNAME | 🥕 sell", iconURL: true },
			description: "Choose which cards you want to sell"
		});

		/* - - - - - { Create the Select Menu } - - - - - */
		let stringSelectMenuOptions = this.cards.map((c, idx) =>
			new StringSelectMenuOptionBuilder()
				.setValue(`card_${idx}`)
				.setLabel(`${c.emoji} ${c.single} [${c.group}] ${c.name}`)
				.setDescription(`UID: ${c.uid} :: GID: ${c.globalID} :: 🗣️ ${c.setID}`)
		);

		// Create the select menu builder
		let stringSelectMenu = new StringSelectMenuBuilder()
			.setCustomId("ssm_cardSelect")
			.setPlaceholder("Choose which cards you want to sell")
			.addOptions(...stringSelectMenuOptions)
			.setMaxValues(this.data.cards.length);

		// Create the action row builder
		let actionRow = new ActionRowBuilder().addComponents(stringSelectMenu);

		/* - - - - - { Send the Embed with Components} - - - - - */
		let message = await embed_sellModule.send({ sendMethod: "followUp", components: actionRow });

		/// Cache
		this.data.activeModule = ModuleType.sell;
		this.data.sent.sell.message = message;
		this.data.sent.sell.canDelete = true;
		this.data.sent.sell.reactionRemove = async () => await reaction.users.remove(this.data.interaction.user.id);

		this.#collectSelectMenu(message);
	}

	async sell(cards = null) {
		cards = _jsT.isArray(cards || this.cards_selected);
		if (!cards.length) return;

		// Validate the selected cards
		cards = await this.#validateSelectedCards(cards);
		if (!cards) return;

		// Remove the user's reaction if possible
		if (this.data.sent.sell.reactionRemove) {
			this.data.sent.sell.canDelete = false;
			this.data.sent.sell.reactionRemove();
		}

		/* - - - - - { Await Confirmation } - - - - - */
		let sellTotal = _jsT.sum(cards.map(c => c.sellPrice));

		// Parse the cards into strings
		let cards_f = cards.length > 10 ? null : cards.map(c => cardManager.toString.basic(c));

		// prettier-ignore
		// Wait for the user to confirm
		let confirmation = await awaitConfirmation({
			user: this.data.interaction.user, message: this.data.sent.sell.message, sendMethod: "edit",
			description: cards_f
				? `**Are you sure you want to sell:**\n${cards_f.join("\n")}`
				: `**Are you sure you want to sell \`${cards.length}\` ${cards.length === 1 ? "card" : "cards"}?**`,
			footer: `you will get ${config.bot.emojis.currency_1.EMOJI} ${sellTotal}`
		});

		if (!confirmation) return;

		/* - - - - - { Sell the Cards } - - - - - */
		// await userManager.inventory.sell(interaction.user.id, cards);

		// Update the cards the user can select
		let _selectedUIDs = this.cards_selected.map(c => c.uid);
		this.cards = this.cards.filter(c => !_selectedUIDs.includes(c.uid));

		// Create the embed :: { SELL }
		let embed_sell = user_ES.sell(this.data.interaction.member, cards, sellTotal);
		return await embed_sell.send({ interaction: this.data.interaction, sendMethod: "followUp" });
	}

	async setFavorite(card = null) {
		card ||= this.cards_selected[0];
		if (!cards) return;

		// Validate the selected cards
		if (!(await this.#validateSelectedCards(card))) return;

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
		card ||= this.cards_selected[0];
		if (!cards) return;

		// Validate the selected cards
		if (!(await this.#validateSelectedCards(card))) return;

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
		cards = _jsT.isArray(cards || this.cards_selected);
		if (!cards.length) return;

		// Validate the selected cards
		cards = await this.#validateSelectedCards(cards);
		if (!cards) return;

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
