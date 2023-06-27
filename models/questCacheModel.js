const { Schema, model } = require('mongoose');

class QuestObjectiveTypes {
    constructor() {
        this.balance = 0;
        this.ribbons = 0;
        this.inventory_count = 0;

        this.level_user = 0;
        this.level_idol = 0;

        this.card_global_ids = [""];
        this.card_sets_complete = [""];
        this.card_duplicates = [{ globalID: "", count: 0 }];

        this.team_ability = 0;
        this.team_reputation = 0;
    }
}

class QuestObjectiveProgress {
    constructor() {
        this.balance = false;
        this.ribbons = false;
        this.inventory_count = false;

        this.level_user = false;
        this.level_idol = false;

        this.card_global_ids = false;
        this.card_sets_complete = false;
        this.card_duplicates = false;

        this.team_ability = false;
        this.team_reputation = false;
    }
}

class QuestCache {
    constructor() {
        this._id = "";

        this.balance = 0;
        this.ribbons = 0;
        this.inventory_count = 0;

        this.level_user = 0;
        this.level_idol = 0;

        this.team_ability = 0;
        this.team_reputation = 0;

        this.progress = [{ questID: "", objectives: new QuestObjectiveProgress }];
    }
}

const schema_questCache = new Schema({
    _id: { type: String, require: true },

    balance: Number, ribbons: Number, inventory_count: Number,
    level_user: Number, level_idol: Number,
    team_ability: Number, team_reputation: Number,

    objectives: Array

}, { collection: "quest_cache" });

module.exports = {
    QuestCache: new QuestCache,
    QuestObjectiveTypes: new QuestObjectiveTypes,
    QuestObjectiveProgress: new QuestObjectiveProgress,

    schema: schema_questCache, model: model("quest_cache", schema_questCache)
};