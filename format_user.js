const user = require('./user_gui.json');

const fs = require('fs');
const { userSettings } = require('./configs/heejinSettings.json');
const cardManager = require('./modules/cardManager');
const cardFormater = require('./format_card_json');

let user_f = {
    _id: user.UserID,

    daily_streak: user.DailyStreak.Count,
    daily_streak_expires: user.DailyStreak.Expires,

    level: user.Level,
    xp: user.Xp,
    xp_for_next_level: user.Level * userSettings.xp.nextLevelXPMultiplier,

    biography: user.Biography,
    balance: user.Balance,

    card_selected_uid: String(user.BattleCard),
    card_favorite_uid: String(user.FavoriteCard),
    card_team_uids: user.Team.map(card => String(card.CardID)),
    card_inventory: Object.entries(user.CardsV2)
        .map(card => cardFormater(card[1], card[0]))
        .map(card => card.rarity !== 100 ? cardManager.parse.toCardLike(card) : card),

    timestamp_started: Date.now()
};

let jsonData = JSON.stringify(user_f, null, 2);
fs.writeFile("user_gui_formatted.json", jsonData, function (err) {
    if (err) {
        console.log(err);
    }
});