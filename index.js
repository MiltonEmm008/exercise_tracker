const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
mongoose
  .connect("mongodb://localhost:27017/exercise")
  .then(() => console.log("Conectado a mongodb"))
  .catch((err) =>
    console.error("Sucedio un error al conectarse a mongodb ", err)
  );

const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: String,
  })
);

const Exercise = mongoose.model(
  "Exercise",
  new mongoose.Schema({
    userId: { type: String, required: true },
    description: String,
    duration: Number,
    date: Date,
  })
);

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().select("-__v");
    return res.json(users);
  } catch (err) {
    console.error("Sucedio un error al obtener a todos los usuarios ", err);
  }
});

app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  try {
    if (!username) {
      return res.status(400).json({ error: "you need to provide username" });
    }
    const existingUser = await User.findOne({ username: username });

    if (existingUser) {
      return res.json({
        username: existingUser.username,
        _id: existingUser._id,
      });
    }

    const newUser = await User.create({ username: username });
    return res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    return res.json({ error: "server error" });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;
  if (!description || !duration) {
    return res.json({ error: "you need to provide all inputs" });
  }
  let exerciseDate = date ? new Date(date) : new Date();
  if (isNaN(duration)) {
    return res.json({ error: "you need to provide a numeric duration" });
  }
  try {
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.json({ error: "theres no user with the provided _id" });
    }
    const newExercise = await Exercise.create({
      userId: userId,
      description: description,
      duration: Number(duration),
      date: exerciseDate,
    });
    return res.json({
      _id: existingUser._id,
      username: existingUser.username,
      date: new Date(newExercise.date).toDateString(),
      duration: newExercise.duration,
      description: newExercise.description,
    });
  } catch (err) {
    console.error("Sucedio un error al ingresar el ejercicio ", err);
    return res.status(500).json({ error: "server error" });
  }
});

/*
{
  "_id": "684f9895509d2d00132fe364",
  "username": "hola2025/02/02",
  "count": 4,
  "log": [
    {
      "description": "Bicep",
      "duration": 10,
      "date": "Sun Feb 02 2025"
    },
    {
      "description": "Bicep",
      "duration": 10,
      "date": "Sun Feb 02 2025"
    },
    {
      "description": "Bicep",
      "duration": 10,
      "date": "Sun Feb 02 2025"
    },
    {
      "description": "Bicep",
      "duration": 10,
      "date": "Sun Feb 02 2025"
    }
  ]
}
*/

app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const _id = req.params._id;
    const { from, to, limit } = req.query;
    const existingUser = await User.findById(_id);
    if (!existingUser) {
      return res.json({ error: "theres no user with the provided _id" });
    }
    let query = { userId: _id };
    if (from || to) {
      let dateFilter = {};
      if (from) dateFilter.$gte = new Date(from);
      if (to) dateFilter.$lte = new Date(to);
      query.date = dateFilter;
    }
    let exercisesQuery = Exercise.find(query);
    if (limit) {
      exercisesQuery = exercisesQuery.limit(Number(limit));
    }
    const userExercises = await exercisesQuery;
    const log = userExercises.map((ex) => ({
      description: ex.description,
      duration: ex.duration,
      date: new Date(ex.date).toDateString(),
    }));
    return res.json({
      _id: existingUser._id,
      username: existingUser.username,
      count: log.length,
      log: log,
    });
  } catch (err) {
    console.error("Sucedio un error al obtener los logs ", err);
    return res.json({ error: "server error" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
