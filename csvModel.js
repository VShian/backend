const mongoose = require("mongoose");

const fileSchema = mongoose.Schema({
	name: {
		type: String,
		unique: true,
		required: true,
	},
	data: [
		{
			Dates: {
				type: String,
				required: true,
			},
			Forecast: {
				type: Number,
				required: true,
			},
		},
	],
});

module.exports = mongoose.model("File", fileSchema);
