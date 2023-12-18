const colors = require("colors");
const moment = require("moment");

module.exports.log = (...args) => {
	const message = args[0];
	const tags = args.slice(1).map((t) => `[${t}]`.cyan);
	console.log(`[${moment().format("HH:mm:ss")}]`.gray, ...tags, message);
};

module.exports.debug = (...args) => {
	if (process.env.LOGGING === "debug");
	{
		const message = args[0];
		const tags = args.slice(1).map((t) => `[${t}]`.cyan);
		console.log(`[${moment().format("HH:mm:ss")}]`.gray, ...tags, colors.gray(message));
	}
};

module.exports.error = function (...args) {
	const message = args[0];
	const tags = args.length > 1 ? args.slice(1).map((t) => `[${t}]`.red) : [];
	console.error(`[${moment().format("HH:mm:ss")}]`.gray, "[ErrorLog]".red, ...tags, message);
};
