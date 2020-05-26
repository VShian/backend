// Require packages
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const csv = require("fast-csv");
const csv2json = require("csvtojson");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const fs = require("fs");
const _ = require("lodash");

// Start server
const upload = multer({ dest: "tmp/" });
const app = express();

// Basic express config
app.use(morgan("dev"));
app.use(helmet());
app.use(cors());

// Connect to database with mongoose
mongoose.connect(
	"mongodb+srv://mongoadmin:mongoadmin@cards-akect.mongodb.net/graphsdatabase?retryWrites=true&w=majority",
	{
		useNewUrlParser: true,
		useFindAndModify: false,
		useCreateIndex: true,
		useUnifiedTopology: true,
	}
);

// Models
require("./csvModel");
const csvModel = require("mongoose").model("File");

app.post("/upload", upload.single("csvfile"), function (req, res) {
	const fileRows = [];

	let count = 0;

	csv.parseFile(req.file.path)
		.on("data", function (data) {
			fileRows.push(data);
			if (++count == 20000) {
				res.status(400).send({
					status: "failure",
					message: "File has more than 20000 rows",
					body: "",
				});
			}
		})
		.on("end", async function () {
			if (req.file.size >= 20971520) {
				res.status(400).send({
					status: "failure",
					message: "File larger than 20 MB",
					body: "",
				});
			} else {
				const jsonArray = await csv2json().fromFile(req.file.path);

				let success = true;

				for (let i = 0; i < jsonArray.length; i++) {
					if (parseInt(jsonArray[i].Forecast) < 0) {
						success = false;
						return;
					}
				}

				if (success) {
					let requestObject = {
						name: req.file.originalname,
						data: jsonArray,
					};

					let savedFile = new csvModel(requestObject);

					try {
						await savedFile.save();

						fs.unlinkSync(req.file.path);

						res.status(200).send({
							status: "success",
							message: "Successfully uploaded file",
							body: "",
						});
					} catch (error) {
						fs.unlinkSync(req.file.path);

						res.status(500).send({
							status: "failure",
							message: "Failed to upload file",
							body: "",
						});
					}
				} else {
					fs.unlinkSync(req.file.path);

					res.status(200).send({
						status: "failure",
						message: "Negative value detected",
						body: "",
					});
				}
			}
		});
});

app.get("/list", async function (req, res) {
	try {
		let data = await csvModel.find({}).select("name");

		res.status(200).send({
			status: "success",
			message: "Received all file names",
			body: data,
		});
	} catch (error) {
		res.status(500).send({
			status: "failure",
			message: "Failed to get file names",
			body: "",
		});
	}
});

app.get("/list/:name", async function (req, res) {
	try {
		let data = await csvModel.findById(req.params.name);

		res.status(200).send({
			status: "success",
			message: "Received all file data",
			body: data,
		});
	} catch (error) {
		res.status(500).send({
			status: "failure",
			message: "No such file exists",
			body: "",
		});
	}
});

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
	var err = new Error("Not Found");
	err.status = 404;
	next(err);
});

// Development error middleware - Print StackTrace
app.use((err, req, res, next) => {
	console.log("Server Error Middleware ", err.stack);
	res.status(err.status || 500);
	res.send({ message: "Something went wrong" });
});

// Server start point
app.listen(4000, (err) => {
	if (err) return new Error("Server not connected");
	console.log(`Listening to port 4000`);
});
