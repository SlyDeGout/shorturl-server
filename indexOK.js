const express = require("express");
const cors = require("cors");

const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const validator = require("validator");

//
// Possible improvement note for a further version :
//
// - The validator used here doesn't check if extensions exist
//
// Here is a sample file of domain extensions :
//import domain_extension_list from "../domain_extension_list";

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

// Create : url in db
app.post("/add", async (req, res) => {
  // visits is optional
  const { hash, visits } = req.body;
  let original = req.body.original;

  // we add "http://" at the beginning of urls which doesn't have it and are are not ftps in order to have the same look for all urls stored
  if (original.indexOf("http") !== 0 && original.indexOf("ftp") !== 0) {
    original = "http://" + original;
  }

  if (!validator.isURL(original)) {
    // url validation NOK
    return res.json({
      error: "Unable to shorten that link. It is not a valid url."
    });
  }

  // url validation OK
  try {
    // Check if url doesn't exist in database
    const link = await Link.findOne({ original: original });
    if (link)
      return res.json({ error: "This url is already in the database ..." });

    // Create new link in database
    const newLink = new Link({
      original: original,
      hash: hash,
      visits: visits || 0
    });
    await newLink.save();

    return res.status(200).json(newLink);
  } catch (e) {
    console.log({ error: e.message });
    res.status(400).json({ error: e.message });
  }
});

// Read : query id
app.get("/link/", async (req, res) => {
  try {
    const link = await Link.findOne({ hash: req.query.hash });
    if (link) {
      res.json(link);
    } else {
      res.status(404).json({
        error: "Link not found, hash : " + req.query.hash
      });
    }
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Read
app.get("/", async (req, res) => {
  try {
    const links = await Link.find();
    res.json(links);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update
app.post("/visit", async (req, res) => {
  try {
    if (req.body.id) {
      const link = await Link.findById(req.body.id);
      if (link) {
        link.visits++;
        await link.save();
        res.status(200).json({ link });
      } else {
        res.status(404).json({
          error: "Link not found, id : " + req.body.id
        });
      }
    } else {
      res.status(400).json({ error: "Missing parameter : id" });
    }
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete
app.post("/delete", async (req, res) => {
  try {
    if (req.body.id) {
      const link = await Link.findById(req.body.id);
      if (link) {
        await link.remove();
        res.status(200).json({ message: "Link deleted, id : " + req.body.id });
      } else {
        res.status(404).json({
          error: "Link not found, id : " + req.body.id
        });
      }
    } else {
      res.status(400).json({ error: "Missing parameter : id" });
    }
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log("Shorturl server started ! ( on port " + port + ")");
});
