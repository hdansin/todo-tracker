// index.js

/**
 * Required External Modules
 */

const express = require("express");
const path = require("path");

// Auth0
const expressSession = require("express-session");
const passport = require("passport");
const Auth0Strategy = require("passport-auth0");

require("dotenv").config(); // Load the environment variables

const authRouter = require("./auth");

// Mongoose/Mongo
var mongoose = require("mongoose");
mongoose
  .connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .catch(error => console.log(error));

var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function() {
  // we're connected!
  console.log("Connected!");
});

var userSchema = mongoose.Schema({
  user_id: String,
  task_list: [
    {
      body: String,
      dueDate: String,
      dateCreated: String,
      dateCompleted: String,
      description: String,
      tags: Array,
      done: Boolean,
      show: Boolean
    }
  ]
});
var User = mongoose.model("User", userSchema);

// Multer for task submission
var multer = require("multer");
var upload = multer();

/**
 * App Variables
 */

const app = express();
const port = process.env.PORT || "8000";

/**
 * Session Configuration
 */

const session = {
  secret: "LoxodontaElephasMammuthusPalaeoloxodonPrimelephas",
  cookie: {},
  resave: false,
  saveUninitialized: false
};

if (app.get("env") === "production") {
  // Serve secure cookies, requires HTTPS
  session.cookie.secure = true;
}

/**
 * Passport Configuration
 */

const strategy = new Auth0Strategy(
  {
    domain: process.env.AUTH0_DOMAIN,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL:
      process.env.AUTH0_CALLBACK_URL || "http://localhost:3000/callback"
  },
  function(accessToken, refreshToken, extraParams, profile, done) {
    /**
     * Access tokens are used to authorize users to an API
     * (resource server)
     * accessToken is the token to call the Auth0 API
     * or a secured third-party API
     * extraParams.id_token has the JSON Web Token
     * profile has all the information from the user
     */
    return done(null, profile);
  }
);

/**
 *  App Configuration
 */

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(express.static(path.join(__dirname, "public")));

app.use(expressSession(session));

passport.use(strategy);
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Creating custom middleware with Express
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

// Router mounting
app.use("/", authRouter);

/**
 * Routes Definitions
 */

const secured = (req, res, next) => {
  if (req.user) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect("/login");
};

// Defined routes
app.get("/", (req, res) => {
  res.render("index", { title: "Home" });
});

app.get("/user", upload.none(), secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  // check if user is in db and add new user if not
  User.findOne({ user_id: userProfile.user_id }, function(err, taskUser) {
    var taskList = taskUser.task_list;
    var tagList = [];
    if (!taskUser) {
      // if user is null the user needs to be created
      taskList = [];
      console.log("created");
      User.create({ user_id: userProfile.user_id, task_list: [] }, function(
        err,
        result
      ) {
        if (err) return console.log(err);
      });
    } else {
      // check if user has tags in taskList and create a list of them
      for (let i = 0; i < taskList.length; i++) {
        if (taskList[i].tags.length > 0) {
          for (let j = 0; j < taskList[i].tags.length; j++) {
            tagList.push(taskList[i].tags[j]);
          }
        }
      }
    }
    res.render("user", {
      title: "Profile",
      userProfile: userProfile,
      taskList: taskUser.task_list,
      tagList: tagList
    });
  });
});

app.post("/done", upload.none(), secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  console.log(req.body); // DB
  User.findOne({ user_id: userProfile.user_id }, function(err, taskUser) {
    if (err) return console.log(err);
    console.log(taskUser.task_list[0]); //DB
    let newList = taskUser.task_list;
    for (let i = 0; i < newList.length; i++) {
      if (newList[i]._id == req.body.taskId) {
        console.log("marking done");
        newList[i].done = true;
        newList[i].show = false;
        newList[i].dateCompleted = new Date().toDateString();
        console.log(newList[i]);
      }
    }
    taskUser.task_list = newList;
    taskUser.save(function(err, result) {
      if (err) return console.log(err);
    });
  }).then(function() {
    res.redirect("/user");
  });
});

app.post("/tagSort", upload.none(), secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  // create a list based on tags submitted
  console.log(req.body.tagNames);
  const makeSortList = function() {
    let Arr = [];
    if (typeof req.body.tagNames === "string") {
      Arr.push(req.body.tagNames);
    } else {
      for (tagName in req.body.tagNames) {
        Arr.push(req.body.tagNames[tagName]);
      }
    }
    return Arr;
  };
  const sortList = makeSortList();

  User.findOne({ user_id: userProfile.user_id }, function(err, taskUser) {
    if (err) return console.log(err);
    let newList = taskUser.task_list;
    // look for tasks with the tags and mark their "show" property
    for (task in newList) {
      // start by hiding all, then show ones that don't match
      newList[task].show = false;
      for (tag in newList[task].tags) {
        if (newList[task].tags[tag]) {
          for (sortItem in sortList) {
            if (sortList[sortItem].trim() === newList[task].tags[tag].trim()) {
              newList[task].show = true;
            }
          }
        }
      }
    }
    taskUser.task_list = newList;
    taskUser.save(function(err, result) {
      if (err) return console.log(err);
    });
  }).then(function() {
    res.redirect("/user");
  });
});

app.post("/newTask", upload.none(), secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  console.log(req.body); // DB

  var tagParse = function() {
    console.log("parsing tags...");
    console.log(req.body.tags);
    if (req.body.tags) {
      var tagArr = [];
      let newTag = "";
      for (let i = 0; i < req.body.tags.length; i++) {
        if (req.body.tags[i] === ",") {
          tagArr.push(newTag);
          newTag = "";
          i++;
        }
        newTag += req.body.tags[i];
      }
      tagArr.push(newTag); // to push last tag
    }
    return tagArr;
  };

  User.findOne({ user_id: userProfile.user_id }, function(err, taskUser) {
    if (err) return console.log(err);
    // Make new task
    let today = new Date();
    let tags = tagParse();
    let task = {
      body: req.body.body,
      description: req.body.description,
      tags: tags,
      dueDate: req.body.dueDate,
      dateCreated: today.toDateString(),
      done: false,
      show: true
    };
    let newList = taskUser.task_list;
    // Update and save user's task list
    newList.push(task);
    taskUser.task_list = newList;
    taskUser.save(function(err, result) {
      if (err) return console.log(err);
    });
  }).then(function() {
    res.redirect("user");
  });
});

/**
 * Server Activation
 */

app.listen(port, () => {
  console.log(`Listening to requests on http://localhost:${port}`);
});
