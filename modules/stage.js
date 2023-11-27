/** @typedef options
 * @property {CommandInteraction} interaction
 * @property {{home:User|GuildMember, away:User|GuildMember}} opponents
 * @property {{home:Card, away:Card}} idol */

const { CommandInteraction, User, GuildMember } = require("discord.js");

const { BetterEmbed } = require("./discordTools");
const { userManager } = require("./mongo/index");
const cardManager = require("./cardManager");
const _jsT = require("./jsTools");

const config = {
	player: require("../configs/config_player.json"),
	bot: require("../configs/config_bot.json")
};

class Stage {
	#resolve = null;

	/** @param {options} options  */
	constructor(options) {
		// prettier-ignore
		options = { interaction: null, opponents: { home: null, away: null }, idol: { home: null, away: null }, ...options };
		options.idol.away ||= cardManager.get.random({ type: "all", level: { min: 1, max: 100 } }); // TODO: ???

		this.data = {
			interaction: options.interaction,
			opponents: options.opponents,
			idol: options.idol,
			// _idol: structuredClone(options.idol),
			turn: 0,
			timeout: {
				start: _jsT.parseTime(config.bot.timeouts.STAGE_START, { type: "s" }),
				turn: _jsT.parseTime(config.bot.timeouts.STAGE_TURN, { type: "ms" })
			},

			// prettier-ignore
			embed: new BetterEmbed({ interaction: options.interaction, author: { text: "$USERNAME | stage", iconURL: true } })
		};

		console.log(this.data.interaction);

		this.data.embed.setFooter({
			text: `Duel starting in ${this.data.timeout.start} ${this.data.timeout.start === 1 ? "seconds" : "second"}...`
		});

		this.data.embed.addFields(
			// Team :: { HOME }
			{
				name: this.data.opponents.home?.displayName || this.data.opponents.home?.username,
				value: cardManager.toString.inventoryEntry(this.data.idol.home, { simplify: true }),
				inline: true
			},
			// Team :: { AWAY }
			{
				name: this.data.opponents.away?.displayName || this.data.opponents.away?.username || "Rival",
				value: cardManager.toString.inventoryEntry(this.data.idol.away, { simplify: true }),
				inline: true
			}
		);
	}

	async start() {
		return new Promise(async resolve => {
			this.#resolve = resolve;

			// Start the countdown
			await this.#countdown();

			await this.data.embed.send();

			// Choose who goes first
			_jsT.chance() ? this.#attack_away() : this.#attack_home();
		});
	}

	async #refresh() {
		return await this.data.embed.send({ sendMethod: "editReply" });
	}

	async #countdown() {
		for (let i = 0, _time = this.data.timeout.start; i < this.data.timeout.start; i++, _time--) {
			// prettier-ignore
			this.data.embed.setFooter({
				text: `Duel starting in ${_time} ${_time === 1 ? "second" : "seconds"}...`
			});

			await Promise.all([this.#refresh(), _jsT.wait(1000)]);
		}
	}

	/** @param {"home"|"away"} teamToAttack */
	#applyDamage(teamToAttack) {
		switch (teamToAttack) {
			case "home":
				// Calculate the resulting attack power :: { AWAY }
				let attackPower_away = _jsT.randomNumber(
					_jsT.percent(30, this.data.idol.away.stats.ability),
					this.data.idol.away.stats.ability
				);

				// prettier-ignore
				// Apply the new HP (reputation) :: { HOME }
				this.data.idol.home.stats.reputation = _jsT.clamp(
					this.data.idol.home.stats.reputation - attackPower_away, { min: 0 }
				);
				return;

			case "away":
				// Calculate the resulting attack power :: { HOME }
				let attackPower_home = _jsT.randomNumber(
					_jsT.percent(30, this.data.idol.away.stats.ability),
					this.data.idol.away.stats.ability
				);

				// prettier-ignore
				// Apply the new HP (reputation) :: { AWAY }
				this.data.idol.away.stats.reputation = _jsT.clamp(
					this.data.idol.away.stats.reputation - attackPower_home, { min: 0 }
				);
				return;
		}
	}

	async #sleep() {
		return await _jsT.wait(this.data.timeout.turn);
	}

	async #attack_home() {
		this.data.turn++;

		// Damage the HOME team
		this.#applyDamage("home");

		// prettier-ignore
		// Update the embed's HOME team field
		this.data.embed.data.fields[0].value = `>>> ${cardManager.toString.inventoryEntry(this.data.idol.home, { simplify: true })}`;

		/// Refresh the embed
		this.data.embed.setFooter({ text: `Turn: ${this.data.turn}` });
		await this.#refresh();

		// Attack team AWAY if HOME still has HP (reputation)
		if (this.data.idol.home.stats.reputation) {
			// Sleep until the next turn can be played
			await this.#sleep();
			return await this.#attack_away();
		}

		// End the battle if HOME is out of HP (reputation)
		return this.#end(this.data.opponents.away, this.data.idol.away);
	}

	async #attack_away() {
		this.data.turn++;

		// Damage the AWAY team
		this.#applyDamage("away");

		// prettier-ignore
		// Update the embed's AWAY team field
		this.data.embed.data.fields[1].value = `>>> ${cardManager.toString.inventoryEntry(this.data.idol.away, { simplify: true })}`;

		/// Refresh the embed
		this.data.embed.setFooter({ text: `Turn: ${this.data.turn}` });
		await this.#refresh();

		// Attack team HOME if AWAY still has HP (reputation)
		if (this.data.idol.away.stats.reputation) {
			// Sleep until the next turn can be played
			await this.#sleep();
			return await this.#attack_home();
		}

		// End the battle if AWAY is out of HP (reputation)
		return this.#end(this.data.opponents.home, this.data.idol.home);
	}

	async #end(user, idol) {
		let xp_user = _jsT.randomNumber(config.player.xp.user.rewards.stage.MIN, config.player.xp.user.rewards.stage.MAX);
		let xp_idol = _jsT.randomNumber(config.player.xp.card.rewards.stage.MIN, config.player.xp.card.rewards.stage.MAX);

		idol.stats.xp += xp_idol;
		let card_leveled = cardManager.levelUp(idol);
		let card = cardManager.parse.toCardLike(card_leveled.card);

		// prettier-ignore
		if (user) await Promise.all([
			userManager.inventory.update(user.id, card),
			userManager.xp.increment(user.id, xp_user, "stage")
		]);

		/// Update embed
		switch (user?.id) {
			// HOME wins
			case this.data.opponents.home.id:
				this.data.embed.data.fields[0].name += " ***Won!***";
				this.data.embed.data.fields[1].name += " ***Lost!***";
				break;

			// AWAY wins
			case this.data.opponents.away?.id:
				this.data.embed.data.fields[0].name += " ***Lost!***";
				this.data.embed.data.fields[1].name += " ***Won!***";
				break;

			// AWAY wins (user didn't pick rival)
			default:
				this.data.embed.data.fields[0].name += " ***Lost!***";
				this.data.embed.data.fields[1].name += " ***Won!***";
				break;
		}

		// prettier-ignore
		await this.data.embed.send({
			footer: user
				? "$WINNER's idol got $XPXP $LEVEL_UP"
						.replace("$WINNER", user?.displayName || user?.username)
						.replace("$XP", xp_idol)
						.replace("$LEVEL_UP", card_leveled.levels_gained
							? `and ${card_leveled.levels_gained} LV.`
							: ""
						)
				: "You lost... Try again next time!"
		});

		return this.#resolve({
			id: user?.id || null,
			user: user || null,
			user_xp: xp_user,
			idol: { card: card_leveled.card, levels: card_leveled.levels_gained, xp: xp_idol }
		});
	}
}

module.exports = Stage;
