/** @typedef options
 * @property {CommandInteraction} interaction
 * @property {{home:User|GuildMember, away:User|GuildMember}} opponents
 * @property {{home:Card, away:Card}} idol */

const { CommandInteraction, User, GuildMember } = require("discord.js");

const { BetterEmbed } = require("./discordTools/_dsT");
const cardManager = require("./cardManager");
const _jsT = require("./jsTools/_jsT");
const logger = require("./logger");

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
		options.idol.away ||= cardManager.get.random({ type: "all", level: { min: 1, max: 100 } });

		this.data = {
			interaction: options.interaction,
			opponents: options.opponents,
			idol: options.idol,
			_idol: structuredClone(options.idol),
			turn: 0,
			timeout: {
				start: _jsT.parseTime(config.bot.timeouts.STAGE_START, { type: "s" }),
				turn: _jsT.parseTime(config.bot.timeouts.STAGE_TURN, { type: "s" })
			},

			embed: new BetterEmbed({
				interaction: options.interaction,
				author: { text: "$USERNAME | stage", iconURL: true }
			})
		};

		this.data.embed.setFooter({
			text: `Duel starting in ${this.data.timeout.start} ${this.data.timeout.start === 1 ? "seconds" : "second"}...`
		});

		this.data.embed.addFields(
			// Team :: { HOME }
			{
				name: this.data.opponents.home?.displayName || this.data.opponents.home?.username,
				value: cardManager.toString.basic(this.data.idol.home),
				inline: true
			},
			// Team :: { AWAY }
			{
				name: this.data.opponents.away?.displayName || this.data.opponents.away?.username,
				value: cardManager.toString.basic(this.data.idol.away),
				inline: true
			}
		);
	}

	async start() {
		return new Promise(async resolve => {
			this.#resolve = resolve;

			// Start the countdown
			await this.#countdown();

			// Choose who goes first
			_jsT.chance() ? this.#attack_away() : this.#attack_home();
		});
	}

	async refresh() {
		return await this.data.embed.send({ sendMethod: "editReply", footer: `Turn: ${this.data.turn}` });
	}

	async #countdown() {
		for (let i = 0; i < this.data.timeout.start; i++) {
			await _jsT.wait(1000);
			this.data.timeout.start--;

			// prettier-ignore
			this.data.embed.setFooter({
				text: `Duel starting in ${this.data.timeout.start} ${this.data.timeout.start === 1 ? "seconds" : "second"}...`
			});

			await this.#refresh();
		}
	}

	/** @param {"home"|"away"} teamToAttack */
	#applyDamage(teamToAttack) {
		switch (teamToAttack) {
			case "home":
				// Calculate the resulting attack power :: { AWAY }
				let attackPower_away = _jsT.randomNumber(
					_jsT.percent(40, this.data.idol.away.stats.ability),
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
					_jsT.percent(40, this.data.idol.away.stats.ability),
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

		// Update the embed's HOME team field
		this.data.embed.data.fields[0].value = cardManager.toString.basic(this.data.idol.home);

		// Refresh the embed
		await this.refresh();

		// Attack team AWAY if HOME still has HP (reputation)
		if (this.data.idol.home.stats.reputation) {
			// Sleep until the next turn can be played
			await this.#sleep();
			return await this.#attack_away();
		}

		// End the battle if HOME is out of HP (reputation)
		return this.end();
	}

	async #attack_away() {}

	end() {}
}
