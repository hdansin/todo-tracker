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
mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true }).
    catch(error => console.log(error));

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
  console.log("Connected!");
});


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
  res.render("user", {
    title: "Profile",
    userProfile: userProfile,
    mockTaskList: mockTaskList
  });
});


/**
 * Server Activation
 */


app.listen(port, () => {
    console.log(`Listening to requests on http://localhost:${port}`);
});
