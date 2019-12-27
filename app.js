// index.js

/**
 * Required External Modules
 */

var express = require("express");
var path = require("path");
var debug = require("debug")("app");
var compression = require("compression");
var helmet = require("helmet");

// Auth0
var expressSession = require("express-session");
var passport = require("passport");
var Auth0Strategy = require("passport-auth0");
var dotenv = require("dotenv");

dotenv.config(); // Load the environment variables

var authRouter = require("./auth");

// Mongoose/Mongo
var mongoose = require("mongoose");
mongoose
  .connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .catch(error => debug(error));

var db = mongoose.connection;
db.on("error", debug.bind(console, "connection error:"));
db.once("open", function() {
  // we're connected!
  debug("Connected!");
});

var userSchema = mongoose.Schema({
  user_id: String,
  display: String,
  view: String,
  show: String,
  task_list: [
    {
      body: String,
      dueDate: String,
      dateCreated: String,
      dateCompleted: String,
      description: String,
      tags: Array,
      done: Boolean,
      show: Boolean,
      edit: Boolean
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

var app = express();
var port = process.env.PORT || "8000";

/**
 * Session Configuration
 */

var session = {
  secret: "LoxodontaElephasMammuthusPalaeoloxodonPrimelephas",
  cookie: {},
  resave: false,
  saveUninitialized: false
};

if (app.get("env") === "production") {
  // Serve secure cookies, requires HTTPS
  app.set("trust proxy", 1);
  session.cookie.secure = true;
}

/**
 * Passport Configuration
 */

var strategy = new Auth0Strategy(
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
app.use(compression()); // Compress all routes
app.use(helmet());

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

var secured = (req, res, next) => {
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
  // function that checks for duplicate tags given an array of tags and a tag
  const isDuplicate = function(tag, tagArr) {
    for (const t in tagArr) {
      if (tagArr[t].trim() === tag.trim()) {
        return true;
      }
    }
    return false;
  };

  // check if user is in db and add new user if not
  User.findOne({ user_id: userProfile.user_id }, function(err, taskUser) {
    // initialize defaults
    var taskList = [];
    var tagList = [];
    var display = "ascending";
    var view = "full";
    var show = "completed";

    if (!taskUser) {
      User.create(
        {
          user_id: userProfile.user_id,
          task_list: [],
          display: "ascending",
          view: "full",
          show: "completed"
        },
        function(err, result) {
          if (err) return debug(err);
        }
      );
    } else {
      taskList = taskUser.taskList;
      display = taskUser.display;
      view = taskUser.view;
      show = taskUser.show;
      // check if user has tags in taskList and create a list of them
      if (!taskList) {
        taskList = [];
      }
      for (let i = 0; i < taskList.length; i++) {
        if (taskList[i].tags.length > 0) {
          for (let j = 0; j < taskList[i].tags.length; j++) {
            // prevent duplicates
            if (tagList.length > 0) {
              if (!isDuplicate(taskList[i].tags[j], tagList)) {
                tagList.push(taskList[i].tags[j]);
              }
            } else {
              tagList.push(taskList[i].tags[j]);
            }
          }
        }
      }
    }
    res.render("user", {
      title: "Profile",
      userProfile: userProfile,
      taskList: taskList,
      tagList: tagList,
      display: display,
      view: view,
      show: show
    });
  });
});

app.get("/viewFull", secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  User.findOne({ user_id: userProfile.user_id }, function(err, taskUser) {
    if (err) return debug(err);
    // Update user's 'view' property to 'minimal'
    taskUser.view = "full";
    taskUser.save(function(err, result) {
      if (err) return debug(err);
    });
  }).then(function() {
    res.redirect("/user");
  });
});

app.get("/viewRegular", secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  User.findOne({ user_id: userProfile.user_id }, function(err, taskUser) {
    if (err) return debug(err);
    // Update user's 'view' property to 'minimal'
    taskUser.view = "regular";
    taskUser.save(function(err, result) {
      if (err) return debug(err);
    });
  }).then(function() {
    res.redirect("/user");
  });
});

app.get("/viewMinimal", secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  User.findOne({ user_id: userProfile.user_id }, function(err, taskUser) {
    if (err) return debug(err);
    // Update user's 'view' property to 'minimal'
    taskUser.view = "minimal";
    taskUser.save(function(err, result) {
      if (err) return debug(err);
    });
  }).then(function() {
    res.redirect("/user");
  });
});

app.get("/showAll", secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  User.findOne({ user_id: userProfile.user_id }, function(err, taskUser) {
    if (err) return debug(err);
    // Mark all task's show property to true
    let newList = taskUser.task_list;
    for (const task in newList) {
      newList[task].show = true;
    }
    taskUser.show = "all";
    taskUser.task_list = newList;
    taskUser.save(function(err, result) {
      if (err) return debug(err);
    });
  }).then(function() {
    res.redirect("/user");
  });
});

app.get("/showUncompleted", secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  User.findOne({ user_id: userProfile.user_id }, function(err, taskUser) {
    if (err) return debug(err);
    // Look for tasks with .done = false and mark .show = true
    // and mark .show = false otherwise
    let newList = taskUser.task_list;
    for (const task in newList) {
      if (!newList[task].done) {
        newList[task].show = true;
      } else {
        newList[task].show = false;
      }
    }
    taskUser.show = "uncompleted";
    taskUser.task_list = newList;
    taskUser.save(function(err, result) {
      if (err) return debug(err);
    });
  }).then(function() {
    res.redirect("/user");
  });
});

app.get("/showCompleted", secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  User.findOne({ user_id: userProfile.user_id }, function(err, taskUser) {
    if (err) return debug(err);
    // Look for tasks with .done = true and mark .show = true
    // and mark .show = false otherwise
    let newList = taskUser.task_list;
    for (const task in newList) {
      if (newList[task].done) {
        newList[task].show = true;
      } else {
        newList[task].show = false;
      }
    }
    taskUser.show = "completed";
    taskUser.task_list = newList;
    taskUser.save(function(err, result) {
      if (err) return debug(err);
    });
  }).then(function() {
    res.redirect("/user");
  });
});

app.get("/orderToggle", secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  User.findOne({ user_id: userProfile.user_id }, function(err, taskUser) {
    if (err) return debug(err);
    if (taskUser.display == "ascending") {
      taskUser.display = "descending";
    } else {
      taskUser.display = "ascending";
    }
    taskUser.save(function(err, result) {
      if (err) return debug(err);
    });
  }).then(function() {
    res.redirect("/user");
  });
});

app.post("/done", upload.none(), secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  User.findOne({ user_id: userProfile.user_id }, function(err, taskUser) {
    if (err) return debug(err);
    let newList = taskUser.task_list;
    for (let i = 0; i < newList.length; i++) {
      if (newList[i]._id == req.body.taskId) {
        // check if done and toggle
        if (newList[i].done) {
          newList[i].done = false;
        } else {
          newList[i].done = true;
          newList[i].dateCompleted = new Date().toDateString();
        }
        if (taskUser.show == "uncompleted") {
          newList[i].show = false;
        }
      }
    }
    taskUser.task_list = newList;
    taskUser.save(function(err, result) {
      if (err) return debug(err);
    });
  }).then(function() {
    res.redirect("/user");
  });
});

app.post("/tagSort", upload.none(), secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  // create a list based on tags submitted
  const makeSortList = function() {
    let Arr = [];
    if (typeof req.body.tagNames === "string") {
      Arr.push(req.body.tagNames);
    } else {
      for (const tagName in req.body.tagNames) {
        Arr.push(req.body.tagNames[tagName]);
      }
    }
    return Arr;
  };
  const sortList = makeSortList();

  User.findOne({ user_id: userProfile.user_id }, function(err, taskUser) {
    if (err) return debug(err);
    let newList = taskUser.task_list;
    // look for tasks with the tags and mark their "show" property
    for (const task in newList) {
      // start by hiding all, then show ones that don't match
      newList[task].show = false;
      for (const tag in newList[task].tags) {
        if (newList[task].tags[tag]) {
          for (const sortItem in sortList) {
            if (sortList[sortItem].trim() === newList[task].tags[tag].trim()) {
              newList[task].show = true;
            }
          }
        }
      }
    }
    taskUser.task_list = newList;
    taskUser.save(function(err, result) {
      if (err) return debug(err);
    });
  }).then(function() {
    res.redirect("/user");
  });
});

app.post("/newTask", upload.none(), secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;

  let tagParse = function() {
    var tagArr = [];

    if (req.body.tags) {
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
    if (err) return debug(err);
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
      show: true,
      edit: false
    };
    let newList = taskUser.task_list;
    // Update and save user's task list
    newList.push(task);
    taskUser.task_list = newList;
    taskUser.save(function(err, result) {
      if (err) return debug(err);
    });
  }).then(function() {
    res.redirect("user");
  });
});

app.post("/showEditForm", upload.none(), secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  User.findOne({ user_id: userProfile.user_id }, function(err, taskUser) {
    if (err) return debug(err);
    // Find task by taskId and mark task.edit = true
    let newList = taskUser.task_list;
    for (const task in newList) {
      if (newList[task]._id == req.body.taskId) {
        newList[task].edit = true;
      }
    }
    taskUser.task_list = newList;
    taskUser.save(function(err, result) {
      if (err) return debug(err);
    });
  }).then(function() {
    res.redirect("/user");
  });
});

app.post("/editTask", upload.none(), secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  let tagParse = function() {
    var tagArr = [];
    if (req.body.tags) {
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
    if (err) return debug(err);
    // Find task by Id
    let newList = taskUser.task_list;
    let tags = [];
    for (const task in newList) {
      if (newList[task]._id == req.body.taskId) {
        if (req.body.tags) {
          tags = tagParse();
        } else {
          tags = newList[task].tags;
        }
        newList[task].body = req.body.body;
        newList[task].description = req.body.description;
        newList[task].tags = tags;
        newList[task].dueDate = req.body.dueDate;
        newList[task].show = true;
        newList[task].edit = false;
      }
    }
    // Update and save user's task list
    taskUser.task_list = newList;
    taskUser.save(function(err, result) {
      if (err) return debug(err);
    });
  }).then(function() {
    res.redirect("user");
  });
});

app.post("/deleteTask", upload.none(), secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;

  User.findOne({ user_id: userProfile.user_id }, function(err, taskUser) {
    if (err) return debug(err);
    // Find task by Id
    let newList = taskUser.task_list;
    for (const task in newList) {
      if (newList[task]._id == req.body.taskId) {
        newList.splice(task, 1);
      }
    }
    // Update and save user's task list
    taskUser.task_list = newList;
    taskUser.save(function(err, result) {
      if (err) return debug(err);
    });
  }).then(function() {
    res.redirect("user");
  });
});

/**
 * Server Activation
 */

app.listen(port, () => {
  debug(`Listening to requests on http://localhost:${port}`);
});
