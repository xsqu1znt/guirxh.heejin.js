require("dotenv").config();

const { connect, userManager } = require("../../modules/mongo");

const userBackup = require("../../.backup/users/users_24_01_13.json");

async function foo() {
	await connect(process.env.MONGO_URI);

	let user_count = await userManager.count();

	// Fetch all the users
	console.log(`fetching ${user_count} users...`);
	let users = await userManager.fetch(null, { type: "full" });

	// Iterate through each user
	for (let i = 0; i < users.length; i++) {
		let _u = users[i];
		let _u_backup = userBackup.find(u => u._id === _u._id) || null;

		console.log(`modifying user document (${i}) '${_u._id}'`);

		// Fix level 100 xp
		if (_u.level === 100) {
			users[i].xp = 0;
			users[i].xp_for_next_level = 0;
		} else {
			// Force XP to integer
			users[i].xp = Math.floor(_u.xp);
			users[i].xp_for_next_level = Math.floor(_u.xp_for_next_level);
		}

		// Fix custom idol
		if (_u_backup) {
			// Check if they have an idol selected
			if (!_u.card_selected_uid) return;

			let idol = _u.card_inventory.find(c => c.id === _u.card_selected_uid);
			let idol_idx = _u.card_inventory.findIndex(c => c.id === _u.card_selected_uid);

			let idol_backup = _u_backup.card_inventory.find(c => c.id === _u.card_selected_uid);

			if (!idol || idol_backup) return;

			// Add the missing card data back
			users[i].card_inventory[idol_idx] = {
				...idol,
				single: idol_backup.single,
				name: idol_backup.name,
				imageURL: idol_backup.imageURL
			};
		}

		// Fix reminders
		for (let idx_r = 0; idx_r < _u.reminders; idx_r++) {
			let _r = _u.reminders[idx_r];

			// prettier-ignore
			// Remove deprecated reminder types
			if (!_r.type === null || !["daily", "stage", "random", "drop_general", "drop_weekly", "drop_season", "drop_event_1", "drop_event_2"].includes(_r.type))
                users[i].reminders.splice(idx_r, 1);

			// Fix reminder data format
			users[i].reminders[idx_r] = {
				type: _r.type,
				timestamp: _r.timestamp <= Date.now() ? 0 : _r.timestamp,
				guildID: _r?.guildID || "",
				channelID: _r?.channelID || "",
				mode: _r?.mode || "channel",
				enabled: _r?.enabled !== (undefined || null) ? _r.enabled : true
			};
		}

		// Fix user data format
		users[i] = {
			_id: users[i]._id,

			daily_streak: users[i].daily_streak,
			daily_streak_expires: users[i].daily_streak_expires,

			level: users[i].level,
			xp: users[i].xp,
			xp_for_next_level: users[i].xp_for_next_level,

			biography: users[i].biography,
			balance: users[i].balance,
			ribbons: users[i].ribbons,

			badges: users[i]?.badges || [],
			charms: users[i]?.charms || new Map(),

			card_selected_uid: users[i].card_selected_uid,
			card_favorite_uid: users[i].card_favorite_uid,
			card_team_uids: users[i].card_team_uids,
			card_inventory: users[i].card_inventory,

			cooldowns: users[i].cooldowns,
			reminders: users[i].reminders,

			timestamp_started: users[i].timestamp_started
		};
	}

	console.log(`pushing changes to mongo for ${user_count} users...`);

	// prettier-ignore
	await Promise.all(users.map(async (_u, idx) => {
        await userManager.models.user.replaceOne({ _id: _u.id }, _u);

        console.log(`replaced user document (${idx}) '${_u._id}'`);
    }));

	console.log(`done pushing changes for ${user_count} users!!`);
}
