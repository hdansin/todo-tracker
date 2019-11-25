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
mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true }).
    catch(error => console.log(error));

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
  console.log("Connected!");
});

var userSchema = mongoose.Schema({ 
    user_id: String,
    task_list: [ { body: String, dueDate: String, dateCreated: String, description: String, tags: Array, done: Boolean } ]
}); 
var User = mongoose.model('User', userSchema);

// Multer for task submission
var multer = require('multer');
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
    res.render("index", {title: "Home" });
});

// Testing
var today = new Date();
console.log(today);

// Testing
var mockTaskList = { 
    "task1": { "task": "Make coffee", "dateCreated": today.toDateString(), "dueDate": new Date('11-23-2019').toDateString(), "description": "French press is the only acceptable coffee.", "done": false  },
    "task2": { "task": "Go to work.", "dateCreated": today.toDateString(), "dueDate": today.toDateString(), "description": "", "done": false  } 
    }

app.get("/user", secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  // check if user is in db and add new user if not
  User.findOne({ user_id: userProfile.user_id }, function(err, taskUser) {
    if (! taskUser) { // if user is null the user needs to be created
        console.log('created');
        User.create({ user_id: userProfile.user_id, task_list: []  }, function(err, result) {
            if (err) return console.log(err);
        }); 
    }    
    console.log('user: ' + taskUser) //DB

    res.render("user", {
        title: "Profile",
        userProfile: userProfile,
        taskList: taskUser.task_list,
        mockTaskList: mockTaskList
    });

  });
  
  
});

app.post("/newTask", upload.none(), secured, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  console.log(req.body) // DB

  var tagParse = function () {
    if (req.body.tags) {
        let tagArr = [];
        let newTag = "";
        for (let i = 0; i < req.body.tags.length; i++) {
            if (req.body.tags[i] === ","){
                tagArr.push(newTag); 
                newTag = "";
                i++;
            }
            newTag += req.body.tags[i];
        }
    }
    return tagArr;
  }
  
    User.findOne({ user_id: userProfile.user_id  }, function(err, taskUser) {
        if (err) return console.log(err);
        // Make new task
        let today = new Date();
        let task = { body: req.body.body, description: req.body.description, tags: tagParse, dueDate: req.body.dueDate, dateCreated: today.toDateString(), done: false }
        let newList = taskUser.task_list;
        // Update and save user's task list
        newList.push(task);
        taskUser.task_list = newList;
        taskUser.save(function (err, result){
            if (err) return console.log(err);
        })

      console.log('found' + taskUser);
    });
    res.redirect('user')
});


/**
 * Server Activation
 */


app.listen(port, () => {
    console.log(`Listening to requests on http://localhost:${port}`);
});
