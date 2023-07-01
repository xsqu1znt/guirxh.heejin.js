const { Schema, model } = require('mongoose');

/** @typedef ObjectiveTypes
 * @type {"balance"|"ribbons"|"cards_in_inventory"|"level_user"|"level_idol"|"team_ability"|"team_reputation"|"card_global_ids"|"card_sets_complete"|"card_duplicates"} */

/* class QuestObjectiveTypes {
    static balance = "balance";
    static ribbons = "ribbons";
    static inventory_count = "inventory_count";

    static level_user = "level_user";
    static level_idol = "level_idol";

    static card_global_ids = "card_global_ids";
    static card_sets_complete = "card_sets_complete";
    static card_duplicates = "card_duplicates";

    static team_ability = "team_ability";
    static team_reputation = "team_reputation";

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

        this.active_quest_ids = [""];
        this.progress = [{ questID: "", objectives: new QuestObjectiveProgress }];
        this.temp = {};
    }
} */

const schema_questCache = new Schema({
    _id: { type: String, require: true },

    balance: Number, ribbons: Number, cards_in_inventory: Number,
    level_user: Number, level_idol: Number,
    team_ability: Number, team_reputation: Number,

    quests_in_progress: Array, progress: Array, temp: Object

}, { collection: "quest_cache" });

module.exports = {
    schema: schema_questCache, model: model("quest_cache", schema_questCache)
};