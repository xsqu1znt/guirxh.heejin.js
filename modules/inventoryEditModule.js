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

const ModuleType = { inactive: 0, sell: 1, setFavorite: 2, setIdolon: 3, vault: 4 };

const moduleTypeEmojiNames = [
	config.bot.emojis.editModule_sell.NAME,
	config.bot.emojis.editModule_setFavorite.NAME,
	config.bot.emojis.editModule_setIdol.NAME,
	config.bot.emojis.editModule_vault.NAME
];

class InventoryEditModule {
	async #validateSelected(cards = null || this.cards_selected) {
		// prettier-ignore
		let uids = _jsT.isArray(cards).map(c => c?.uid).filter(uid => uid);

		// Check if the cards exists in the user's card_inventory
		let has = await userManager.inventory.has(this.data.interaction.user.id, { uids });

		// Filter out cards not found
		cards = cards.filter((c, idx) => has[idx]);

		// prettier-ignore
		// Send an embed error message if the user doesn't have the required cards
		if (!cards.length) await error_ES.send({
			interaction: this.interaction,
			description: `${uids.length ? "Those cards are" : "That card is"} not in your inventory`,
			sendMethod: "channel"
		});

		return cards.length ? cards : false;
	}

	async #collectReactions() {
		if (this.data.collectors.reaction || !this.data.message) {
			this.data.collectors.reaction.resetTimer();
			return;
		}

		// Create the collection filter
		let filter = (reaction, user) => {
			// Remove the user's reaction
			if (![this.data.client.user.id, this.data.interaction.user.id].includes(user.id)) reaction.users.remove(user.id);

			return this.#emojis.moduleType.includes(reaction.emoji.name) && user.id === this.data.interaction.user.id;
		};

		/// Create the collector
		let collector = this.data.message.createReactionCollector({ filter, idle: 60000, dispose: true });
		this.data.reactionCollector = collector;

		/* - - - - - { Collector - COLLECT } - - - - - */
		collector.on("collect", async (reaction, user) => {
			// prettier-ignore
			switch (reaction.emoji.name) {
				case config.bot.emojis.editModule_sell.NAME: return await this.#sendEmbed_sell(() => reaction.users.remove(user.id));

				case config.bot.emojis.editModule_setFavorite.NAME: break;

				case config.bot.emojis.editModule_setIdol.NAME: break;

				case config.bot.emojis.editModule_vault.NAME: break;
			}
		});

		/* - - - - - { Collector - DISPOSE } - - - - - */
		collector.on("remove", async (reaction, user) => {
			// prettier-ignore
			switch (reaction.emoji.name) {
				case config.bot.emojis.editModule_sell.NAME:
					// Delete the sell module message
					if (this.data.messages.sellModule.msg && this.data.messages.sellModule.canDelete) {
						try {
							await this.data.messages.sellModule.msg.delete();
							this.data.messages.sellModule.msg = null;
							this.data.messages.sellModule.canDelete = false;
						} catch {}
					}

					return;

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

	/** @param {Message} message  */
	async #collectSelectMenu(message, removeReaction = null) {
		if (this.data.collectors.selectMenu) this.data.collectors.selectMenu.stop();

		// Create the collection filter
		let filter = async i => {
			// prettier-ignore
			try { await i.deferUpdate(); } catch {}
			return i.user.id === this.data.interaction.user.id;
		};

		/// Create the collector
		let collector = message.createMessageComponentCollector({ filter, idle: 30000 });
		this.data.collectors.selectMenu = collector;

		/* - - - - - { Collector - COLLECT } - - - - - */
		collector.on("collect", async i => {
			switch (i.customId) {
				case "ssm_cardSelect":
					// Gather index numbers
					let card_idxs = i.values.map(val => Number(val.split("_")[1]));

					// Gather selected cards
					this.data.selectedCards.sell = card_idxs.map(idx => this.data.cards[idx]);
					return await this.sell(null, removeReaction);
			}
		});

		/* - - - - - { Collector - END } - - - - - */
		collector.on("end", collected => {
			console.log(`Collected ${collected.size} items`);
		});
	}

	/** @param {Client} client @param {CommandInteraction} interaction @param {Message} message @param {options} options */
	constructor(client, interaction, message, options) {
		options = { cards: [], ...options };

		/* - - - - - { Variables } - - - - - */
		this.client = client;
		this.interaction = interaction;
		this.message = message;

		this.cards = options.cards;
		this.cards_selected = [];

		this.data = {
			activeModule: ModuleType.inactive,

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
			case "sell": await this.data.message.react(config.bot.emojis.editModule_sell.EMOJI); break;

			case "setFavorite": await this.data.message.react(config.bot.emojis.editModule_setFavorite.EMOJI); break;

			case "setIdol": await this.data.message.react(config.bot.emojis.editModule_setIdol.EMOJI); break;

			case "vault": await this.data.message.react(config.bot.emojis.editModule_vault.EMOJI); break;
		}
	}

	async #sendEmbed_sell() {
		// prettier-ignore
		// Create the embed :: { SELL MODULE }
		let embed_sellModule = new BetterEmbed({
			interaction: this.interaction, author: { text: "$USERNAME | 🥕 sell", iconURL: true },
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
		this.data.sent.sell.message = message;
		this.data.sent.sell.canDelete = true;
		this.data.activeModule = ModuleType.sell;

		this.#collectSelectMenu(message);
	}

	async sell(cards = null) {
		// Remove the user's reaction if possible
		if (this.data.sent.sell.reactionRemove) {
			this.data.sent.sell.canDelete = false;
			this.data.sent.sell.reactionRemove();
		}

		cards = cards ? _jsT.isArray(cards) : this.data.selectedCards.sell;
		if (!cards.length) return;

		/* - - - - - { Await Confirmation } - - - - - */
		let sellTotal = _jsT.sum(cards.map(c => c.sellPrice));

		// Parse the cards into strings
		let cards_f = cards.length > 10 ? null : cards.map(c => cardManager.toString.basic(c));

		// prettier-ignore
		// Wait for the user to confirm
		let confirmation = await awaitConfirmation({
			user: this.data.interaction.user, message: this.data.messages.sellModule.msg, sendMethod: "edit",
			description: cards_f
				? `**Are you sure you want to sell:**\n${cards_f.join("\n")}`
				: `**Are you sure you want to sell \`${cards.length}\` ${cards.length === 1 ? "card" : "cards"}?**`,
			footer: `you will get ${config.bot.emojis.currency_1.EMOJI} ${sellTotal}`
		});

		if (!confirmation) return;

		/* - - - - - { Sell the Cards } - - - - - */
		// let { success } = await userManager.inventory.sell(interaction.user.id, cards);

		// prettier-ignore
		/* if (!success) return await error_ES.send({
            interaction, description: "Cannot sell cards that are not in your inventory",
            sendMethod: "channel"
		}); */

		// Update the cards the user can select
		let _selectedUIDs = this.data.selectedCards.map(c => c.uid);
		this.data.cards = this.data.cards.filter(c => !_selectedUIDs.includes(c.uid));

		// Create the embed :: { SELL }
		let embed_sell = user_ES.sell(this.data.interaction.member, cards, sellTotal);
		return await embed_sell.send({ interaction: this.data.interaction, sendMethod: "followUp" });
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
