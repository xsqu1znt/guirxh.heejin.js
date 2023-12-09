/** @typedef {"sell"|"setFavorite"|"setIdol"|"addVault"} ModuleType */

/** @typedef options
 * @property {Cards[]|Cards} cards
 * @property {ModuleType[]|ModuleType} modules */

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

const ModuleType = { inactive: 0, sell: 1, setFavorite: 2, setIdol: 3, addVault: 4 };

const moduleTypeEmojis = {
	sell: config.bot.emojis.inventoryModule_sell,
	setFavorite: config.bot.emojis.inventoryModule_setFavorite,
	setIdol: config.bot.emojis.inventoryModule_setIdol,
	addVault: config.bot.emojis.inventoryModule_addVault,

	names: [
		config.bot.emojis.inventoryModule_sell.NAME,
		config.bot.emojis.inventoryModule_setFavorite.NAME,
		config.bot.emojis.inventoryModule_setIdol.NAME,
		config.bot.emojis.inventoryModule_addVault.NAME
	]
};

class InventoryEditModule {
	#cleanUp(cautious = false) {
		this.data.activeModule = ModuleType.inactive;

		// Stop the select menu interaction collector
		if (this.data.collectors.selectMenu) {
			this.data.collectors.selectMenu.stop();
			this.data.collectors.selectMenu = null;
		}

		// Reset data and delete sent messages
		let _sentKeys = Object.keys(this.data.sent);

		// prettier-ignore
		for (let key of _sentKeys) {
			let sent = this.data.sent[key];
			
			// Delete the message :: { CAUTIOUS }
			if (!cautious && sent.message) {
				if (sent.message.deletable) sent.message.delete().catch(() => null);
				this.data.sent[key].message = null;
			}

			// Delete the message :: { CARE-FREE }
			if (cautious && sent.message && sent.canDelete) {
				if (sent.message.deletable) sent.message.delete().catch(() => null);
				this.data.sent[key].message = null;
			}

			// Remove user reactions
			if (sent.removeReaction) sent.removeReaction();

			// Reset other values
			this.data.sent[key].canDelete = false;
			this.data.sent[key].reactionRemove = null;
		}
	}

	async #validateSelectedCards(cards = null || this.data.cards_selected) {
		cards = _jsT.isArray(cards);

		// prettier-ignore
		let uids = cards.map(c => c?.uid).filter(uid => uid);

		// Check if the cards exists in the user's card_inventory
		let has = _jsT.isArray(await userManager.inventory.has(this.data.interaction.user.id, { uids }));

		// Filter out cards not found
		cards = cards.filter((c, idx) => has[idx]);

		// prettier-ignore
		// Send an embed error message if the user doesn't have the required cards
		if (!cards.length) await error_ES.send({
			interaction: this.data.interaction,
			description: `${uids.length === 1 ? "That card is" : "Those cards are"} not in your inventory`,
			sendMethod: "followUp",
			ephemeral: true
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
			// prettier-ignore
			// Remove other user's reactions
			if (![this.data.client.user.id, this.data.interaction.user.id].includes(user.id))
				try { reaction.users.remove(user.id); } catch {}

			// Check if the reaction was relevant to this module
			return user.id === this.data.interaction.user.id && moduleTypeEmojis.names.includes(reaction.emoji.name);
		};

		// prettier-ignore
		// Create the collector
		this.data.collectors.reaction = this.data.message.createReactionCollector({
			filter, idle: this.data.timeouts.moduleReactions, dispose: true
		});

		/* - - - - - { Collector - COLLECT } - - - - - */
		this.data.collectors.reaction.on("collect", async (reaction, user) => {
			if (!moduleTypeEmojis.names.includes(reaction.emoji.name)) return;

			// Check if there's an active module
			if (this.data.activeModule !== ModuleType.inactive) {
				reaction.users.remove(user.id).catch(() => null);

				// prettier-ignore
				// Send an embed error message
				return await error_ES.send({
					interaction: this.data.interaction,
					description: "You can only do `1` thing at a time, silly!",
					sendMethod: "followUp", ephemeral: true
				});
			}

			// Check if there's any cards to edit
			if (!this.data.cards.length) {
				reaction.users.remove(user.id).catch(() => null);

				// prettier-ignore
				// Send an embed error message
				return await error_ES.send({
					interaction: this.data.interaction,
					description: "There are no cards available to edit",
					sendMethod: "followUp", ephemeral: true
				});
			}

			// prettier-ignore
			switch (reaction.emoji.name) {
				case moduleTypeEmojis.sell.NAME: return await this.#sendEmbed_sell(reaction);

				case moduleTypeEmojis.setFavorite.NAME: return await this.#sendEmbed_setFavorite(reaction);

				case moduleTypeEmojis.setIdol.NAME: return await this.#sendEmbed_setIdol(reaction);

				case moduleTypeEmojis.addVault.NAME: return await this.#sendEmbed_addVault(reaction);

				default: return;
			}
		});

		/* - - - - - { Collector - REMOVE } - - - - - */
		this.data.collectors.reaction.on("remove", async (reaction, user) => {
			// prettier-ignore
			switch (reaction.emoji.name) {
				case moduleTypeEmojis.sell.NAME:
					if (this.data.activeModule === ModuleType.sell) this.#cleanUp(true);
					return;

				case moduleTypeEmojis.setFavorite.NAME:
					if (this.data.activeModule === ModuleType.setFavorite) this.#cleanUp(true);
					return;

				case moduleTypeEmojis.setIdol.NAME:
					if (this.data.activeModule === ModuleType.setIdol) this.#cleanUp(true);
					return;

				case moduleTypeEmojis.addVault.NAME:
					if (this.data.activeModule === ModuleType.addVault) this.#cleanUp(true);
					return;

				default: return;
			}
		});

		/* - - - - - { Collector - END } - - - - - */
		this.data.collectors.reaction.on("end", collected => {
			this.data.collectors.reaction = null;

			// Remove any existing reactions
			this.data.message.reactions.removeAll().catch(() => null);
			this.#cleanUp();
		});
	}

	/** @param {Message} message  */
	async #collectSelectMenu(message) {
		if (this.data.collectors.selectMenu) {
			this.data.collectors.selectMenu.resetTimer();
			return;
		}

		// Create the collection filter
		let filter = async i => {
			await i.deferUpdate().catch(() => null);
			return i.user.id === this.data.interaction.user.id;
		};

		// prettier-ignore
		// Create the collector
		this.data.collectors.selectMenu = message.createMessageComponentCollector({
			filter, idle: this.data.timeouts.cardSelect
		});

		/* - - - - - { Collector - COLLECT } - - - - - */
		this.data.collectors.selectMenu.on("collect", async i => {
			if (i.customId !== "ssm_cardSelect") return;

			// Get the indexes of the selected cards
			// this is assuming select menu option values have a format of "card_1" and so on
			let card_idxs = i.values.map(val => Number(val.split("_")[1]));

			// Add the selected cards to the array
			this.data.cards_selected = card_idxs.map(idx => this.data.cards[idx]);

			// prettier-ignore
			// Trigger the next action
			switch (this.data.activeModule) {
				case ModuleType.sell: return await this.sell().then(() => this.#cleanUp());

				case ModuleType.setFavorite: return await this.setFavorite().then(() => this.#cleanUp());

				case ModuleType.setIdol: return await this.setIdol().then(() => this.#cleanUp());

				case ModuleType.addVault: return await this.addVault().then(() => this.#cleanUp());

				default: return;
			}
		});

		/* - - - - - { Collector - END } - - - - - */
		this.data.collectors.selectMenu.on("end", collected => {
			this.#cleanUp(true);
		});
	}

	/** @param {Client} client @param {CommandInteraction} interaction @param {Message} message @param {options} options */
	constructor(client, interaction, message, options) {
		options = { cards: [], modules: [], ...options };

		/* - - - - - { Variables } - - - - - */
		this.data = {
			client: client,
			interaction: interaction,
			message: message,

			cards: options.cards,
			cards_selected: [],

			activeModule: ModuleType.inactive,
			modulesEnabled: _jsT.isArray(_jsT.unique(options.modules)),

			timeouts: {
				moduleReactions: _jsT.parseTime(config.bot.timeouts.INVENTORY_MODULE_REACTIONS),
				cardSelect: _jsT.parseTime(config.bot.timeouts.INVENTORY_MODULE_CARD_SELECT)
			},

			sent: {
				sell: { message: null, canDelete: false, removeReaction: null },
				setFavorite: { message: null, canDelete: false, removeReaction: null },
				setIdol: { message: null, canDelete: false, removeReaction: null },
				vault: { message: null, canDelete: false, removeReaction: null }
			},

			collectors: {
				/** @type {ReactionCollector} */
				reaction: null,
				/** @type {InteractionCollector} */
				selectMenu: null
			}
		};

		// Add any module reactions to the given message
		if (this.data.modulesEnabled.length) this.setModuleReactions();
	}

	/** @param {...ModuleType} moduleType */
	async setModuleReactions(...moduleType) {
		if (moduleType.length) this.data.modulesEnabled = _jsT.unique(moduleType);

		// Remove any existing reactions
		await this.data.message.reactions.removeAll().catch(() => null);

		this.#collectReactions();

		// prettier-ignore
		for (let type of this.data.modulesEnabled) switch (type) {
			case "sell": await this.data.message.react(moduleTypeEmojis.sell.EMOJI).catch(() => null); break;

			case "setFavorite": await this.data.message.react(moduleTypeEmojis.setFavorite.EMOJI).catch(() => null); break;

			case "setIdol": await this.data.message.react(moduleTypeEmojis.setIdol.EMOJI).catch(() => null); break;

			case "addVault": await this.data.message.react(moduleTypeEmojis.addVault.EMOJI).catch(() => null); break;

			default: continue;
		}
	}

	// TODO: Make a cardManager.toString method for this.
	async #sendEmbed_sell(reaction = null) {
		// prettier-ignore
		// Create the embed :: { SELL MODULE }
		let embed_sellModule = new BetterEmbed({
			interaction: this.data.interaction, author: { text: "$USERNAME | 🥕 sell", iconURL: true },
			description: "Choose which cards you want to sell"
		});

		/* - - - - - { Create the Select Menu } - - - - - */
		let stringSelectMenuOptions = this.data.cards.map((c, idx) =>
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
		// prettier-ignore
		this.data.sent.sell.removeReaction = async () => {
			try { await reaction.users.remove(this.data.interaction.user.id); } catch {}
		};

		this.#collectSelectMenu(message);
	}

	async sell(cards = null) {
		cards = _jsT.isArray(cards || this.data.cards_selected);
		if (!cards.length) return;

		/* - - - - - { Clean Up } - - - - - */
		if (this.data.sent.sell.removeReaction) {
			// this is set to false because this message is going to be edited
			this.data.sent.sell.canDelete = false;
			this.data.sent.sell.removeReaction();
		}

		// Stop select menu interaction collection
		if (this.data.collectors.selectMenu) this.data.collectors.selectMenu.stop();

		/* - - - - - { Validation } - - - - - */
		cards = await this.#validateSelectedCards(cards);
		if (!cards) return this.#cleanUp();

		/* - - - - - { Await Confirmation } - - - - - */
		let sellTotal = _jsT.sum(cards.map(c => c.sellPrice));
		// Parse the cards into strings
		let cards_f = cards.length > 10 ? null : cards.map(c => cardManager.toString.basic(c));

		// prettier-ignore
		// Wait for the user to confirm
		let confirmation = await awaitConfirmation({
			user: this.data.interaction.user, message: this.data.sent.sell.message, sendMethod: "edit",
			description: cards_f
				? `**Are you sure you want to sell:**\n>>> ${cards_f.join("\n")}`
				: `**Are you sure you want to sell \`${cards.length}\` ${cards.length === 1 ? "card" : "cards"}?**`,
			footer: `you will get ${config.bot.emojis.currency_1.EMOJI} ${sellTotal}`
		});

		if (!confirmation) return;

		/* - - - - - { Sell the Cards } - - - - - */
		await userManager.inventory.sell(this.data.interaction.user.id, cards, false);

		// Update the cards the user can select
		let _selectedUIDs = this.data.cards_selected.map(c => c.uid);
		this.data.cards = this.data.cards.filter(c => !_selectedUIDs.includes(c.uid));

		// Create the embed :: { SELL }
		let embed_sell = user_ES.sell(this.data.interaction.member, cards, sellTotal);
		await embed_sell.send({ interaction: this.data.interaction, sendMethod: "followUp" });
	}

	// TODO: Make a cardManager.toString method for this.
	async #sendEmbed_setFavorite(reaction = null) {
		// prettier-ignore
		// Create the embed :: { SELL MODULE }
		let embed_setFavoriteModule = new BetterEmbed({
			interaction: this.data.interaction, author: { text: "$USERNAME | ⭐ favorite", iconURL: true },
			description: "Choose which card you want to set as your `⭐ favorite`"
		});

		/* - - - - - { Create the Select Menu } - - - - - */
		let stringSelectMenuOptions = this.data.cards.map((c, idx) =>
			new StringSelectMenuOptionBuilder()
				.setValue(`card_${idx}`)
				.setLabel(`${c.emoji} ${c.single} [${c.group}] ${c.name}`)
				.setDescription(`UID: ${c.uid} :: GID: ${c.globalID} :: 🗣️ ${c.setID}`)
		);

		// Create the select menu builder
		let stringSelectMenu = new StringSelectMenuBuilder()
			.setCustomId("ssm_cardSelect")
			.setPlaceholder("Choose which card you want as your favorite")
			.addOptions(...stringSelectMenuOptions)
			.setMaxValues(1);

		// Create the action row builder
		let actionRow = new ActionRowBuilder().addComponents(stringSelectMenu);

		/* - - - - - { Send the Embed with Components} - - - - - */
		let message = await embed_setFavoriteModule.send({ sendMethod: "followUp", components: actionRow });

		/// Cache
		this.data.activeModule = ModuleType.setFavorite;
		this.data.sent.setFavorite.message = message;
		this.data.sent.setFavorite.canDelete = true;
		// prettier-ignore
		this.data.sent.setFavorite.removeReaction = async () => {
			try { await reaction.users.remove(this.data.interaction.user.id); } catch {}
		};

		this.#collectSelectMenu(message);
	}

	async setFavorite(card = null) {
		card ||= this.data.cards_selected[0];
		if (!card) return;

		/* - - - - - { Clean Up } - - - - - */
		if (this.data.sent.setFavorite.removeReaction) {
			// this is set to false because this message is going to be edited
			this.data.sent.setFavorite.canDelete = false;
			this.data.sent.setFavorite.removeReaction();
		}

		// Stop select menu interaction collection
		if (this.data.collectors.selectMenu) this.data.collectors.selectMenu.stop();

		/* - - - - - { Validation } - - - - - */
		card = (await this.#validateSelectedCards(card))[0];
		if (!card) return this.#cleanUp();

		/* - - - - - { Favorite the Card } - - - - - */
		let userData = await userManager.fetch(this.data.interaction.user.id, { type: "essential" });

		// prettier-ignore
		// Check if the card's already favorited
		if (userData.card_favorite_uid === card.uid) return await error_ES.send({
			interaction: this.data.interaction,
			description: `\`${card.uid}\` is already your \`⭐ favorite\``,
			sendMethod: "followUp", ephemeral: true
		});

		// Set the card as the user's favorite in Mongo
		await userManager.update(this.data.interaction.user.id, { card_favorite_uid: card.uid });

		/// Create the embed :: { SET FAVORITE }
		let card_f = cardManager.toString.basic(card);

		// prettier-ignore
		let embed_setFavorite = new BetterEmbed({
			interaction: this.data.interaction, author: { text: "$USERNAME | set", iconURL: true },
			description: `Your \`⭐ favorite\` has been set to:\n> ${card_f}`,
			imageURL: card.imageURL
		});

		await embed_setFavorite.send({ sendMethod: "followUp" });
	}

	// TODO: Make a cardManager.toString method for this.
	async #sendEmbed_setIdol(reaction = null) {
		// prettier-ignore
		// Create the embed :: { SELL MODULE }
		let embed_setIdolModule = new BetterEmbed({
			interaction: this.data.interaction, author: { text: "$USERNAME | 🏃 idol", iconURL: true },
			description: "Choose which card you want to set as your `🏃 idol`"
		});

		/* - - - - - { Create the Select Menu } - - - - - */
		let stringSelectMenuOptions = this.data.cards.map((c, idx) =>
			new StringSelectMenuOptionBuilder()
				.setValue(`card_${idx}`)
				.setLabel(`${c.emoji} ${c.single} [${c.group}] ${c.name}`)
				.setDescription(`UID: ${c.uid} :: GID: ${c.globalID} :: 🗣️ ${c.setID}`)
		);

		// Create the select menu builder
		let stringSelectMenu = new StringSelectMenuBuilder()
			.setCustomId("ssm_cardSelect")
			.setPlaceholder("Choose which card you want as your idol")
			.addOptions(...stringSelectMenuOptions)
			.setMaxValues(1);

		// Create the action row builder
		let actionRow = new ActionRowBuilder().addComponents(stringSelectMenu);

		/* - - - - - { Send the Embed with Components} - - - - - */
		let message = await embed_setIdolModule.send({ sendMethod: "followUp", components: actionRow });

		/// Cache
		this.data.activeModule = ModuleType.setIdol;
		this.data.sent.setIdol.message = message;
		this.data.sent.setIdol.canDelete = true;
		// prettier-ignore
		this.data.sent.setIdol.removeReaction = async () => {
			try { await reaction.users.remove(this.data.interaction.user.id); } catch {}
		};

		this.#collectSelectMenu(message);
	}

	async setIdol(card = null) {
		card ||= this.data.cards_selected[0];
		if (!card) return;

		/* - - - - - { Clean Up } - - - - - */
		if (this.data.sent.setIdol.removeReaction) {
			// this is set to false because this message is going to be edited
			this.data.sent.setIdol.canDelete = false;
			this.data.sent.setIdol.removeReaction();
		}

		// Stop select menu interaction collection
		if (this.data.collectors.selectMenu) this.data.collectors.selectMenu.stop();

		/* - - - - - { Validation } - - - - - */
		card = (await this.#validateSelectedCards(card))[0];
		if (!card) return this.#cleanUp();

		/* - - - - - { Favorite the Card } - - - - - */
		let userData = await userManager.fetch(this.data.interaction.user.id, { type: "essential" });

		// prettier-ignore
		// Check if the card's already their idol
		if (userData.card_selected_uid === card.uid) return await error_ES.send({
			interaction: this.data.interaction,
			description: `\`${card.uid}\` is already your \`🏃 idol\``,
			sendMethod: "followUp", ephemeral: true
		});

		// Set the card as the user's idol in Mongo
		await userManager.update(this.data.interaction.user.id, { card_selected_uid: card.uid });

		/// Create the embed :: { SET IDOL }
		let card_f = cardManager.toString.basic(card);

		// prettier-ignore
		let embed_setIdol = new BetterEmbed({
			interaction: this.data.interaction, author: { text: "$USERNAME | set", iconURL: true },
			description: `Your \`🏃 idol\` has been set to:\n> ${card_f}`,
			imageURL: card.imageURL
		});

		await embed_setIdol.send({ sendMethod: "followUp" });
	}

	// TODO: Make a cardManager.toString method for this.
	async #sendEmbed_addVault(reaction = null) {
		// prettier-ignore
		// Create the embed :: { SELL MODULE }
		let embed_vaultModule = new BetterEmbed({
			interaction: this.data.interaction, author: { text: "$USERNAME | 🔒 vault", iconURL: true },
			description: "Choose which cards you want to add to your `🔒 vault`"
		});

		/* - - - - - { Create the Select Menu } - - - - - */
		let stringSelectMenuOptions = this.data.cards.map((c, idx) =>
			new StringSelectMenuOptionBuilder()
				.setValue(`card_${idx}`)
				.setLabel(`${c.emoji} ${c.single} [${c.group}] ${c.name}`)
				.setDescription(`UID: ${c.uid} :: GID: ${c.globalID} :: 🗣️ ${c.setID}`)
		);

		// Create the select menu builder
		let stringSelectMenu = new StringSelectMenuBuilder()
			.setCustomId("ssm_cardSelect")
			.setPlaceholder("Choose which cards you want to add to your vault")
			.addOptions(...stringSelectMenuOptions)
			.setMaxValues(this.data.cards.length);

		// Create the action row builder
		let actionRow = new ActionRowBuilder().addComponents(stringSelectMenu);

		/* - - - - - { Send the Embed with Components} - - - - - */
		let message = await embed_vaultModule.send({ sendMethod: "followUp", components: actionRow });

		/// Cache
		this.data.activeModule = ModuleType.addVault;
		this.data.sent.vault.message = message;
		this.data.sent.vault.canDelete = true;
		// prettier-ignore
		this.data.sent.vault.removeReaction = async () => {
			try { await reaction.users.remove(this.data.interaction.user.id); } catch {}
		};

		this.#collectSelectMenu(message);
	}

	async addVault(cards = null) {
		cards = _jsT.isArray(cards || this.data.cards_selected);
		if (!cards.length) return;

		/* - - - - - { Clean Up } - - - - - */
		if (this.data.sent.sell.removeReaction) {
			// this is set to false because this message is going to be edited
			this.data.sent.sell.canDelete = false;
			this.data.sent.sell.removeReaction();
		}

		// Stop select menu interaction collection
		if (this.data.collectors.selectMenu) this.data.collectors.selectMenu.stop();

		/* - - - - - { Validation } - - - - - */
		cards = await this.#validateSelectedCards(cards);
		if (!cards) return this.#cleanUp();

		/// Check if the cards are already locked
		let _uids = cards.map(c => c.uids);

		cards = cards.filter(c => !c.locked);
		if (!cards.length) {
			this.#cleanUp();

			// prettier-ignore
			return await error_ES.send({
				interaction: this.data.interaction,
				description: `${_uids.length === 1 ? `That card is` : "Those cards are"} already in your \`🔒 vault\``,
				sendMethod: "followUp", ephemeral: true
			});
		}

		/* - - - - - { Lock the Cards } - - - - - */
		for (let i = 0; i < cards.length; i++) cards[i].locked = true;

		// Update the cards in the user's card_inventory
		await Promise.all(cards.map(c => userManager.inventory.update(this.data.interaction.user.id, c)));

		// Create the embed :: { VAULT }
		let cards_f = cards.length > 10 ? null : cards.map(c => cardManager.toString.basic(c));

		// prettier-ignore
		let embed_vault = new BetterEmbed({
			interaction: this.data.interaction, author: { text: `$USERNAME | vault`, iconURL: true },
			description: cards_f
				? `You added to your \`🔒 vault\`:\n>>> ${cards_f.join("\n")}`
				: `You addded \`${cards.length}\` ${cards.length === 1 ? "card" : "cards"} to your \`🔒 vault\``
		});

		return await embed_vault.send({ sendMethod: "followUp" });
	}
}

module.exports = InventoryEditModule;
