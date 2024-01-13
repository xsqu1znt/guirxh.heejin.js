const { userManager } = require("../../modules/mongo");

async function foo() {
	console.log("fetching");
	let userDatas = await userManager.fetch(null, { type: "id" });

	console.log("applying");
	await Promise.all(
		userDatas.map(userData => userManager.update(userData._id, { cooldowns: [], reminders: [], charms: new Map() }))
	);
	console.log("done");
}

foo();
