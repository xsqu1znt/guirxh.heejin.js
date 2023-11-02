const { User } = require("discord.js");

const { BetterEmbed } = require("./discordTools/_dsT");
const cardManager = require("./cardManager");
const logger = require("./logger");

const config = { bot: require("../configs/config_bot.json") };

const embed_titles = {
	gift: "📬 You have a message!"
};

/** @param {User} gifter @param {User} recipient @param {Array<string>} cards_f */
async function gift_cards(gifter, recipient, cards) {
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

/** @param {User} recipient @param {User} gifter @param {number} amount  @param {number} balance */
async function gift_currency(recipient, gifter, amount, balance, currencyType) {
	let currencyEmoji = "";
	// prettier-ignore
	switch (currencyType) {
        case "carrot": currencyEmoji = config.bot.emojis.currency_1.EMOJI; break;
        case "ribbon": currencyEmoji = config.bot.emojis.currency_2.EMOJI; break;
	}

	// Create the embed :: { CURRENCY }
	let embed_currency = new BetterEmbed({
		author: embed_titles.gift,
		description: `**${gifter.username}** gave you \`${currencyEmoji} ${amount}\``,
		footer: `balance: ${currencyEmoji} ${balance}`,
		timestamp: true
	});

	// Send the embed to the user
	try {
		return await recipient.send({ embeds: [embed_currency] });
	} catch (err) {
		logger.error("Failed to DM user", `userID: ${recipient?.userID || "n/a"} | type: gift_currency`, err);
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
