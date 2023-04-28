const { BaseCommandInteraction, MessageEmbed } = require('discord.js');

const { numberTools, randomTools, asyncTools } = require('./jsTools');
const { cardDataParser } = require('./mongoDataParser');
const { embed_colors, battling } = require('../configs/settings.json');

/**
 * Calculates the total HP of both the home, and away team.
 * @param {{home_playerId:Number,home_playerName:String,home:Array,away_playerId:Number,away_playerName:String,away:Array}} teams the teams object.
 */
function battle_calculateTeamHP(teams) {
    let sum_home = 0;
    teams.home.forEach(teamMember => sum_home += teamMember.inv.stats.hp);

    let sum_away = 0;
    teams.away.forEach(teamMember => sum_away += teamMember.inv.stats.hp);

    return { home: sum_home, away: sum_away };
}

/**
 * Starts the dungeon/player battle sequence and awaits the entire battle until a winner is declared.
 * @param {BaseCommandInteraction} interaction the command interaction
 * @param {MessageEmbed} embed the message embed
 * @param {Number} difficulty the dungeon's difficulty
 * @param {{home_playerId:Number,home_playerName:String,home:Array,away_playerId:Number,away_playerName:String,away:Array}} teams the teams object.
 * @returns {{interation:BaseCommandInteraction,embed:MessageEmbed,difficulty:Number,teams:{home_playerId:Number,home_playerName:String,home:Array,away_playerId:Number,away_playerName:String,away:Array},turn:Number,log:Array,winnerId:Number}} the battleData
 */
async function battle_start(interaction, embed, difficulty, teams) {
    return new Promise(resolve => battle_homeAttackAway(resolve, {
        interaction,
        embed,
        difficulty,
        teams,
        turn: 1,
        log: []
    }));
}

/**
 * The moment where the HOME team attacks the AWAY team.
 * @param {PromiseResolver} resolve
 * @param {{interation:BaseCommandInteraction,embed:MessageEmbed,difficulty:Number,teams:{home_playerId:Number,home_playerName:String,home:Array,away_playerId:Number,away_playerName:String,away:Array},turn:Number,log:Array,winnerId:Number}} battleData
 */
async function battle_homeAttackAway(resolve, battleData) {
    // Go through each home team member and pick an enemy card to attack
    // obviously only allowing alive team members to attack
    // also checking if the opposing team actually has any alive members to avoid an infinite loop
    for (let i = 0; i < battleData.teams.home.length; i++) if (battle_calculateTeamHP(battleData.teams).away > 0 && battleData.teams.home[i].inv.stats.hp > 0) {
        // Choose a random number which will be the index for the target enemy
        let _targetIndex = randomTools.number(0, (battleData.teams.away.length - 1) || 0);

        // Don't target a dead enemy
        while (battleData.teams.away[_targetIndex].inv.stats.hp <= 0)
            _targetIndex = randomTools.number(0, (battleData.teams.away.length - 1) || 0);

        // Calculate the damage to deal to the enemy (giving attack a variation of 10)
        let _atk = battleData.teams.home[i].inv.stats.attack;
        let damageToDeal = numberTools.clamp(Number(randomTools.number(_atk - 3, _atk).toFixed(2)), 1, _atk);

        // Calculate the resulting hp the enemy will be left with
        let damageResult = Number((battleData.teams.away[_targetIndex].inv.stats.hp - damageToDeal).toFixed(2));

        // Set the enemy's (hp) to the calculated (damageResult) (also preventing overkill)
        battleData.teams.away[_targetIndex].inv.stats.hp = damageResult > 0 ? damageResult : 0;

        // Log the result
        // "HOME -> squ1d's 'Renjun' (Lvl:32) dealt 69.5 damage to mina <3's 'Sunwoo' (Lvl:28)"
        battleData.log.push("> **HOME** -> **$ATKR_DISPLAY_NAME**'s \'$ATKR_CARD_NAME\' (Lvl:$ATKR_LVL) dealt $DMG damage to **$REC_DISPLAY_NAME**'s \'$REC_CARD_NAME\' (Lvl:$REC_LVL)"
            .replace("$ATKR_DISPLAY_NAME", battleData.teams.home_playerName)
            .replace("$ATKR_CARD_NAME", battleData.teams.home[i].name)
            .replace("$ATKR_LVL", battleData.teams.home[i].inv.level)
            .replace("$DMG", damageToDeal)
            .replace("$REC_DISPLAY_NAME", battleData.teams.away_playerName)
            .replace("$REC_CARD_NAME", battleData.teams.away[_targetIndex].name)
            .replace("$REC_LVL", battleData.teams.away[_targetIndex].inv.level)
        );
    }

    // Update the embed with new information regarding the current state of the battle
    // Keep the log to a max of (battling.TEAM_SIZE) for the most recent actions
    battleData.log = battleData.log.slice(-battling.TEAM_SIZE);

    // Update the embed's (Away)'s {Team} field with their new stats
    battleData.embed.fields[1].value = battleData.teams.away.map(c => cardDataParser.toStringBattleStats(c)).join("\n");

    // Update the embed's {Action Log} field
    battleData.embed.fields[2].value = battleData.log.join("\n");

    // Update the embed's footer to reflect what (turn) we're currently on
    battleData.embed.setFooter({ text: `turn ${battleData.turn++} | awaiting ${battleData.teams.away_playerName}'s move` });

    // Choose a random embed color for this turn
    battleData.embed.setColor(randomTools.choice(embed_colors.RGB));

    // Edit the interaction's reply embed with this new information
    await battleData.interaction.editReply({ embeds: [battleData.embed] });

    // If the (away) team isn't dead yet, allow them to attack
    if (battle_calculateTeamHP(battleData.teams).away > 0) {
        await asyncTools.wait(battling.TURN_DELAY);
        return battle_awayAttackHome(resolve, battleData);
    }

    // If the away team's dead, announce victory
    battleData.winnerId = battleData.teams.home_playerId;
    return resolve(battleData);
}

/**
 * The moment where the AWAY team attacks the HOME team.
 * @param {PromiseResolver} resolve
 * @param {{interation:BaseCommandInteraction,embed:MessageEmbed,difficulty:Number,teams:{home_playerId:Number,home_playerName:String,away:Array,away_playerId:Number,away_playerName:String,home:Array},turn:Number,log:Array,winnerId:Number}} battleData
 */
async function battle_awayAttackHome(resolve, battleData) {
    // Go through each away team member and pick an enemy card to attack
    // obviously only allowing alive team members to attack
    // also checking if the opposing team actually has any alive members to avoid an infinite loop
    for (let i = 0; i < battleData.teams.away.length; i++) if (battle_calculateTeamHP(battleData.teams).home > 0 && battleData.teams.away[i].inv.stats.hp > 0) {
        // Choose a random number which will be the index for the target enemy
        let _targetIndex = randomTools.number(0, (battleData.teams.home.length - 1) || 0);

        // Don't target a dead enemy
        while (battleData.teams.home[_targetIndex].inv.stats.hp <= 0)
            _targetIndex = randomTools.number(0, (battleData.teams.home.length - 1) || 0);

        // Calculate the damage to deal to the enemy (giving attack a variation of 10)
        let _atk = battleData.teams.away[i].inv.stats.attack;
        let damageToDeal = numberTools.clamp(Number(randomTools.number(_atk - 3, _atk).toFixed(2)), 1, _atk);

        // Calculate the resulting hp the enemy will be left with
        let damageResult = Number((battleData.teams.home[_targetIndex].inv.stats.hp - damageToDeal).toFixed(2));

        // Set the enemy's (hp) to the calculated (damageResult) (also preventing overkill)
        battleData.teams.home[_targetIndex].inv.stats.hp = damageResult > 0 ? damageResult : 0;

        // Log the result
        // "AWAY -> mina <3's 'Sunwoo' (Lvl:28) dealt 95.5 damage to squ1d's 'Renjun' (Lvl:32)"
        battleData.log.push("> AWAY -> **$ATKR_DISPLAY_NAME**'s \'$ATKR_CARD_NAME\' (Lvl:$ATKR_LVL) dealt $DMG damage to **$REC_DISPLAY_NAME**'s \'$REC_CARD_NAME\' (Lvl:$REC_LVL)"
            .replace("$ATKR_DISPLAY_NAME", battleData.teams.away_playerName)
            .replace("$ATKR_CARD_NAME", battleData.teams.away[i].name)
            .replace("$ATKR_LVL", battleData.teams.away[i].inv.level)
            .replace("$DMG", damageToDeal)
            .replace("$REC_DISPLAY_NAME", battleData.teams.home_playerName)
            .replace("$REC_CARD_NAME", battleData.teams.home[_targetIndex].name)
            .replace("$REC_LVL", battleData.teams.home[_targetIndex].inv.level)
        );
    }

    // Update the embed with new information regarding the current state of the battle
    // Keep the log to a max of (battling.TEAM_SIZE) for the most recent actions
    battleData.log = battleData.log.slice(-battling.TEAM_SIZE);

    // Update the embed's (Home)'s {Team} field with their new stats
    battleData.embed.fields[0].value = battleData.teams.home.map(c => cardDataParser.toStringBattleStats(c)).join("\n");

    // Update the embed's {Action Log} field
    battleData.embed.fields[2].value = battleData.log.join("\n");

    // Update the embed's footer to reflect what (turn) we're currently on
    battleData.embed.setFooter({ text: `turn ${battleData.turn++} | awaiting ${battleData.teams.home_playerName}'s move` });

    // Choose a random embed color for this turn
    battleData.embed.setColor(randomTools.choice(embed_colors.RGB));

    // Edit the interaction's reply embed with this new information
    await battleData.interaction.editReply({ embeds: [battleData.embed] });

    // If the (home) team isn't dead yet, allow them to attack
    if (battle_calculateTeamHP(battleData.teams).home > 0) {
        await asyncTools.wait(battling.TURN_DELAY);
        return battle_homeAttackAway(resolve, battleData);
    }

    // If the away team's dead, announce victory
    battleData.winnerId = battleData.teams.away_playerId;
    return resolve(battleData);
}

module.exports = { battle_start, battle_homeAttackAway, battle_awayAttackHome, battle_calculateTeamHP };