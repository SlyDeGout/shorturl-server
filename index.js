const express = require("express");
const cors = require("cors");

const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();
app.use(bodyParser.json());
app.use(cors());

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost/shorturl", {
  useNewUrlParser: true
});

const Link = mongoose.model("Link", {
  original: {
    type: String,
    default: ""
  },
  hash: {
    type: String,
    default: ""
  },
  visits: {
    type: Number,
    default: 0
  }
});

// Create url in db
app.post("/add", async (req, res) => {
  // ???? VERIFIER
  // visits is optional ????????
  const { original, hash, visits } = req.body;

  try {
    // Check if url doesn't exist in database
    const link = await Link.findOne({ original: original });
    if (link)
      return res
        .status(400)
        .json({ message: "URL is already in database ..." });

    // Create new link in database
    const newLink = new Link({
      original: original,
      hash: hash,
      visits: visits || 0
    });
    await newLink.save();

    return res.status(200).json({
      id: newLink._id
    });
  } catch (e) {
    console.log({ error: e.message });
    res.status(400).json({ error: e.message });
  }
});

// Read : query id
app.get("/link/", async (req, res) => {
  try {
    const link = await Link.findOne({ hash: req.query.hash });
    console.log("link param " + req.query.hash);
    res.json(link);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Read
app.get("/", async (req, res) => {
  try {
    const links = await Link.find();
    res.json(links);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update
app.post("/update", async (req, res) => {
  try {
    if (req.body.id) {
      const link = await Link.findById(req.body.id);
      link.visits++;
      //
      // ???????? UPDATE PROCESS ???????
      //
      await link.save();

      res.status(200).json({
        link
      });
    } else {
      res.status(400).json({ message: "Missing parameter : id" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete
app.post("/delete", async (req, res) => {
  try {
    if (req.body.id) {
      const link = await Link.findOne({ _id: req.body.id });
      // Autre manière de trouver un document à partir d'un `id` :
      // const student = await Student.findById(req.body.id);
      await link.remove();

      const links = await Link.find();
      res.status(200).json({
        links: links
      });
    } else {
      res.status(400).json({ message: "Missing parameter : id" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log("Shorturl server started !!! ( on port " + port + ")");
});
