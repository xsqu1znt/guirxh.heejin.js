const { User } = require("discord.js");

const { BetterEmbed } = require("./discordTools/_dsT");
const cardManager = require("./cardManager");
const logger = require("./logger");

const config_bot = require("../configs/config_bot.json");

const embed_titles = {
	gift: "📬 You have a message!"
};

/** @param {User} recipient @param {User} gifter @param {Array<string>} cards_f */
async function gift_cards(recipient, gifter, cards) {
	if (!Array.isArray(cards)) cards = [cards];

	// Get the last card in the array
	let cards_last = cards.slice(-1)[0] || cards[0];

	// Parse each card into a string if card_f wasn't provided
	let cards_f = cards.map(card => cardManager.toString.basic(card));

	// Create the embed
	let embed_giftCards = new BetterEmbed({
		author: { text: embed_titles.gift },
		description: `You got a gift from **${gifter.username}**\n>>> ${cards_f.join("\n")}`,
		imageURL: cards_last.imageURL,
		showTimestamp: true
	});

	// Send the embed to the user
	try {
		return await recipient.send({ embeds: [embed_giftCards] });
	} catch (err) {
		logger.error("Failed to DM user", `userID: ${recipient?.userID || "N/A"} | TYPE: gift_card`);
	}
}

/** @param {User} recipient @param {User} gifter @param {number} amount  @param {number} currentBalance */
async function gift_currency(recipient, gifter, amount, currentBalance) {
	// Create the embed
	let embed_giftCurrency = new BetterEmbed({
		author: { text: embed_titles.gift },
		description: `You got \`${config_bot.emojis.CURRENCY_1.EMOJI} ${amount}\` from **${gifter.username}**\n> Balance currently: \`${config_bot.emojis.CURRENCY_1.EMOJI} ${currentBalance}\``,
		showTimestamp: true
	});

	// Send the embed to the user
	try {
		return await recipient.send({ embeds: [embed_giftCurrency] });
	} catch (err) {
		logger.error("Failed to DM user", `userID: ${recipient?.userID || "N/A"} | TYPE: gift_currency`, err);
	}
}

/** @param {User} recipient @param {{}} quest */
async function quest_complete(recipient, quest) {
	/// Format rewards into a string
	// General rewards
	let rewards_f = [];
	if (quest.rewards?.xp) rewards_f.push(`\`☝️ ${quest.rewards.xp}XP\``);
	if (quest.rewards?.carrots) rewards_f.push(`\`🥕 ${quest.rewards.carrots}\``);
	if (quest.rewards?.ribbons) rewards_f.push(`\`🎀 ${quest.rewards.ribbons}\``);

	// Join general rewards together in a single string
	rewards_f = [rewards_f.join(" ")];

	// Card rewards
	if (quest.rewards?.card_global_ids?.length) {
		rewards_f.push(`\`🃏 ${quest.rewards.card_global_ids.length}\``);
		// Join the cards recieved icon with the other reward line
		rewards_f = [rewards_f.join(" ")];

		// Push each individual card_f to the reward array
		rewards_f.push(...quest.rewards.card_global_ids.map(card => cardManager.toString.basic(card)));
	}

	// Create the embed
	let embed_questComplete = new BetterEmbed({
		author: { text: `📜 Good job! You completed \'${quest.name}\'`, user: recipient, iconURL: null },
		description: `**You got**: ${rewards_f.shift()}\n${rewards_f.length ? rewards_f.join("\n") : ""}`,
		showTimestamp: true
	});

	// Send the embed to the user
	try {
		return await recipient.send({ embeds: [embed_questComplete] });
	} catch (err) {
		logger.error("Failed to DM user", `userID: ${recipient?.userID || "N/A"} | TYPE: quest_complete`, err);
	}
}

module.exports = {
	gift: {
		cards: gift_cards,
		currency: gift_currency
	},

	quest: {
		complete: quest_complete
	}
};
