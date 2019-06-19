const express = require("express");
const cors = require("cors");

const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const validator = require("validator");
const validate = require("ip-validator");

// Note : 1542 domain name extenstions in this file ( should be updated frequently or replaced by a nice api call )
const domain_extension_list = require("./domain_extension_list");

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

getPosition = (string, substring, nth) => {
  let index = string.split(substring, nth).join(substring).length;
  return index;
};

validExtension = url => {
  // get position of the 3rd "/" ( the two first are "://" ) in order to get the string here  "://(string)/"
  // and substring between beginning and the third "/" ( if it exists or will be the whole string length )
  url = url.substr(0, getPosition(url, "/", 3));
  // check if there is a port number like in "http://xxxxxx:3000"
  // and the case of http://user:pass@xxxxxx:3000 or http://user@xxxxxx:3000
  // and substring url in order to exclude it before extension validation
  let position = url.indexOf("@") > getPosition(url, ":", 2) ? 3 : 2;
  // 3 : if user:pass@xxxxx because the last ":" will be the 3rd one
  // 2 : if user:pass@xxxxx because the last ":" will be the 2nd one
  url = url.substr(0, getPosition(url, ":", position));
  // check if there is something like "#anchor"
  // and substring url in order to exclude it before extension validation
  url = url.substr(
    0,
    getPosition(url, "#", 1) // 1 to get the first "#"
  );

  // check if this is not a ipv4 address otherwise extension verification will fail
  if (!validate.ipv4(url)) {
    const extension = url.substr(url.lastIndexOf("."));
    let extensionExists = false;
    for (let i = 0; i < domain_extension_list.list.length; i++) {
      if (domain_extension_list.list[i] === extension) extensionExists = true;
    }
    return extensionExists;
  }

  return true;
};

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

  // the url is valid so now we're validating the extension
  if (!validExtension(original)) {
    return res.json({
      error: "It is not a valid domain name extension."
    });
  }

  // url and extension validation OK
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
