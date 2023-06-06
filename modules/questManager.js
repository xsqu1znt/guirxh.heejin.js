const { userManager } = require('./mongo');
const quests = require('../configs/quests.json');

async function validate(userID) {
    let { quest_cache } = await userManager.fetch(userID, "quest");

    for (let quest of quests) {
        
    }
}