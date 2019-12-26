// auth.js

/**
 * Required External Modules
 */

var express = require("express");
var router = express.Router();
var passport = require("passport");
var dotenv = require("dotenv");
var util = require("util");
var url = require("url");
var querystring = require("querystring");

dotenv.config();

/**
 * Routes Definitions
 */

router.get(
  "/login",
  passport.authenticate("auth0", {
    scope: "openid email profile"
  }),
  (req, res) => {
    res.redirect("/");
  }
);

router.get("/callback", (req, res, next) => {
  passport.authenticate("auth0", (err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      console.log("user: " + user); //DB
      return res.redirect("/login");
    }
    req.logIn(user, err => {
      if (err) {
        return next(err);
      }
      const returnTo = req.session.returnTo;
      delete req.session.returnTo;
      console.log("logged in user: " + user); //DB
      res.redirect(returnTo || "/");
    });
  })(req, res, next);
});

router.get("/logout", (req, res) => {
  req.logOut();

  let returnTo = req.protocol + "://" + req.hostname;
  const port = req.connection.localPort;

  if (port !== undefined && port !== 80 && port !== 443) {
    returnTo =
      process.env.NODE_ENV === "production"
        ? `${returnTo}/`
        : `${returnTo}:${port}/`;
  }

  const logoutURL = new URL(
    util.format("https://%s/logout", process.env.AUTH0_DOMAIN)
  );
  const searchString = querystring.stringify({
    client_id: process.env.AUTH0_CLIENT_ID,
    returnTo: returnTo
  });
  logoutURL.search = searchString;

  res.redirect(logoutURL);
});

/**
 * Module Exports
 */

module.exports = router;
