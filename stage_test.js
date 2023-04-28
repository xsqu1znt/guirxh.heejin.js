// This is just a basic test on how the battles work
// This script isn't actually used anywhere in the bot
// I just made this so help visualize how the battles would work when I was working on the command

// If you want to run it use the following command:
// node battleTest.js

const { numberTools, randomTools } = require('./modules/jsTools');

let teams = {
    home: [
        { name: "Mina", hp: randomTools.number(50, 666), atk: randomTools.number(10, 69) },
        { name: "Sana", hp: randomTools.number(50, 666), atk: randomTools.number(10, 69) },
        { name: "Renjun", hp: randomTools.number(50, 666), atk: randomTools.number(10, 69) }
    ],

    away: [
        { name: "Lisa", hp: randomTools.number(50, 666), atk: randomTools.number(10, 69) },
        { name: "JYNA", hp: randomTools.number(50, 666), atk: randomTools.number(10, 69) },
        { name: "Sunwoo", hp: randomTools.number(50, 666), atk: randomTools.number(10, 69) }
    ]
};

let turns = 0;
let delay = 1000;

async function battle_start() {
    return new Promise(resolve => battle_homeAttackAway(resolve));
}

function battle_homeAttackAway(resolve) {
    console.clear();

    // Go through each home team member and pick an enemy card to attack
    // obviously only allowing alive team members to attack
    // also checking if the opposing team actually has any alive members to avoid an infinite loop
    for (let i = 0; i < teams.home.length; i++) if (CalculateTeamTotal_HP(teams).away > 0 && teams.home[i].hp > 0) {
        // Choose the target enemy at random
        let _targetIndex = randomTools.number(0, teams.away.length);

        // Don't target a dead enemy
        while (teams.away[_targetIndex].hp <= 0)
            _targetIndex = randomTools.number(0, teams.away.length);

        // Calculate the damage to deal to the enemy
        let _atk = teams.home[i].atk;
        let damageToDeal = numberTools.clamp(randomTools.number(_atk - 5, _atk), 1, _atk);

        // Calculate the resulting hp the enemy will be left with
        let damageResult = teams.away[_targetIndex].hp - damageToDeal;

        // Set the enemy's (hp) to the calculated (damageResult) (also preventing overkill)
        teams.away[_targetIndex].hp = damageResult > 0 ? damageResult : 0;

        // Log the result
        let attacker_name = teams.home[i].name;
        let reciever_name = teams.away[_targetIndex].name;
        let reciever_hp = teams.away[_targetIndex].hp;
        console.log(`\'${attacker_name}\' dealt ${damageToDeal} damage to \'${reciever_name}\' - remaining hp: ${reciever_hp}`);
    }

    // Keep track of how many turns this takes
    turns++;

    // If the away team isn't dead yet, allow them to attack
    if (CalculateTeamTotal_HP(teams).away > 0)
        return setTimeout(() => battle_awayAttackHome(resolve), delay);

    // If the away team's dead, announce victory
    return resolve("Home");
}

function battle_awayAttackHome(resolve) {
    console.clear();

    // Go through each away team member and pick an enemy card to attack
    // obviously only allowing alive team members to attack
    // also checking if the opposing team actually has any alive members to avoid an infinite loop
    for (let i = 0; i < teams.away.length; i++) if (CalculateTeamTotal_HP(teams).home > 0 && teams.away[i].hp > 0) {
        // Choose the target enemy at random
        let _targetIndex = randomTools.number(0, teams.home.length);

        // Don't target a dead enemy
        while (teams.home[_targetIndex].hp <= 0)
            _targetIndex = randomTools.number(0, teams.home.length);

        // Calculate the damage to deal to the enemy
        let _atk = teams.away[i].atk;
        let damageToDeal = numberTools.clamp(randomTools.number(_atk - 5, _atk), 1, _atk);

        // Calculate the resulting hp the enemy will be left with
        let damageResult = teams.home[_targetIndex].hp - damageToDeal;

        // Set the enemy's (hp) to the calculated (damageResult) (also preventing overkill)
        teams.home[_targetIndex].hp = damageResult > 0 ? damageResult : 0;

        // Log the result
        let attacker_name = teams.away[i].name;
        let reciever_name = teams.home[_targetIndex].name;
        let reciever_hp = teams.home[_targetIndex].hp;
        console.log(`\'${attacker_name}\' dealt ${damageToDeal} damage to \'${reciever_name}\' - remaining hp: ${reciever_hp}`);
    }

    // Keep track of how many turns this takes
    turns++;

    // If the away team isn't dead yet, allow them to attack
    if (CalculateTeamTotal_HP(teams).home > 0)
        return setTimeout(() => battle_homeAttackAway(resolve), delay);

    // If the away team's dead, announce victory
    return resolve("Away");
}

// >> Custom Functions
function CalculateTeamTotal_HP(teams) {
    let sum_home = 0;
    teams.home.forEach(mem => sum_home += mem.hp);

    let sum_away = 0;
    teams.away.forEach(mem => sum_away += mem.hp);

    return { home: sum_home, away: sum_away };
}

battle_start()
    .then((winner) => console.log(`\nCongratulations! ${winner} won in ${turns} ${turns > 1 ? "turns" : "turn"}!`))
    .catch("???");