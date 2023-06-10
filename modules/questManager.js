const { botSettings: { currencyIcon } } = require('../configs/heejinSettings.json');
const { userManager } = require('./mongo');
const quests = require('../configs/quests.json');

function exists() {
    return quests.length > 0;
}

function toString() {
    let parsed = [];

    for (let quest of quests) {
        let str = `**${quest.name}** :: ${quest.description}\n>>> `;
        let requirements = [];

        /// Requirements -> Balance/ribbons
        if (quest.required.balance)
            requirements.push(`\`%COMPLETED_B\` \`${currencyIcon} %USER_BALANCE/${quest.required.balance}\``);

        if (quest.required.ribbons)
            requirements.push(`\`%COMPLETED_R\` \`🎀 %USER_RIBBONS/${quest.required.ribbons}\``);

        /// Requirements -> Cards
        if (quest.required.cards.inventoryTotal)
            requirements.push(`\`%COMPLETED_I\` \`🃏 INV %USER_INVENTORY_TOTAL/${quest.required.cards.inventoryTotal}\``);

        if (quest.required.cards.requiredGlobalIDs)
            requirements.push(`\`%COMPLETED_G\` \`🃏 GID\` ${quest.required.cards.requiredGlobalIDs.map(gid => `\`${gid}\``).join(" ").trim()}`);

        if (quest.required.cards.setsCompleted)
            requirements.push(`\`%COMPLETED_S\` \`🃏 SET\` ${quest.required.cards.setsCompleted.map(set => `\`${set}\``).join(" ").trim()}`);

        if (quest.required.cards.duplicates)
            requirements.push(`\`%COMPLETED_D\` \`🃏 DUPE\` ${quest.required.cards.duplicates.map(dupe => `\`${dupe.globalID}\``).join(" ").trim()}`);

        /// Requirements -> Levels
        if (quest.required.level.user)
            requirements.push(`\`%COMPLETED_L_U\` \`📈 LV. %USER_LEVEL_USER/${quest.required.level.user}\``);

        if (quest.required.level.idol)
            requirements.push(`\`%COMPLETED_L_I\` \`🃏 LV. %USER_LEVEL_IDOL/${quest.required.level.idol}\``);

        /// Requirements -> Team
        if (quest.required.level.user)
            requirements.push(`\`%COMPLETED_T_A\` \`👯‍♀️ %USER_TEAM_ABILITY/${quest.required.team.ability}\``);

        if (quest.required.level.idol)
            requirements.push(`\`%COMPLETED_T_R\` \`👯‍♀️ %USER_TEAM_REPUTATION/${quest.required.team.reputation}\``);

        str += requirements.join("\n");

        parsed.push(str);
    }

    return parsed;
}

async function validate(client, userData) {
    /* let { quest_cache } = await userManager.fetch(userID, "quest");

    for (let quest of quests) {
        
    } */
}

module.exports = {
    exists,
    toString,
    validate
};