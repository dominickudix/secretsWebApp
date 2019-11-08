//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const findOrCreate = require('mongoose-findorcreate');
// const encrypt = require('mongoose-encryption');
// const md5 = require("md5");
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const app = express();


app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded(({
  extended: true
})));

app.use(session({
  secret:"Our little secret.",
  resave: false,
   saveUninitialized: false
}));

//initialize passport
app.use(passport.initialize());
app.use(passport.session());


//connection to database
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

//create schema for database
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId:String,
  facebookId:String,
  secret:String
});


//plugins for passport
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);



// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET,
//   encryptedFields: ['password']
// });

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileUrl: "http://googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    //check for recieved data
    // console.log(profile);


    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    //check for recieved data
      // console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


//create new schema for displaying Secrets
// const secretSchema = new mongoose.Schema({
//   secret: String
// });
// const Secret = mongoose.model("secret",secretSchema);



//render the home pages
app.get("/", function(req, res) {
  res.render("home");
});


// render the google authentication page
app.get("/auth/google",
  passport.authenticate('google', { scope: ['profile'] }));

  app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect("/secrets");
    });


//render the facebook authentication pages
app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/login", function(req, res) {
  res.render("login");
});
app.get("/register", function(req, res) {
  res.render("register");
});


app.get("/secrets", function(req,res){
  //authentication not required
  if (req.isAuthenticated()){
User.find({"secret":{$ne:null}}, function(err,foundSecrets){
  if(!err){
    res.render("secrets", {postSecret:"Jack Bauer is my Hero",
     personalSecret:foundSecrets});
  }
});
  }




    // res.render("secrets");
    // Secret.find({}, function(err,foundSecrets){
    //   if (foundSecrets.length === 0 ){
    //     res.render("secrets",{postSecret:"Jack Bauer is my Hero"});
    //   }else{
    //   res.render("secrets", {postSecret:"Jack Bauer is my Hero",
    //   newSecretPost:foundSecrets});
    //   }
    // });
  else{
    res.redirect("/login");
  }



});


//obtain new user registration information
app.post("/register", function(req, res) {
User.register({username:req.body.username}, req.body.password, function(err,user){
  if(err){
    console.log("err");
    res.redirect("/register");
  }else{
    passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    });
  }

});
});



//login existing user
app.post("/login", function(req, res) {
const user = new User({
  username:req.body.username,
  passowrd: req.body.password
});

req.login(user, function(err){
  if(err){
    console.log(err);
  }else{
    passport.authenticate("local")(req,res, function(){
      res.redirect("/secrets");
    });
  }
});

});

app.get("/submit", function(req,res){
  if (req.isAuthenticated()){
      res.render("submit");
  }else{
    res.redirect("/login");
  }


});



app.post("/submit", function(req,res){
  const newSecret = req.body.secret;
User.findById(req.user.id, function(err, foundUser){
  if(err){
    res.send("no user found");
  }else{
    if(foundUser){
      foundUser.secret = newSecret;
      foundUser.save(function(){
        res.redirect("/secrets");
      });
    }
  }
});




// const secret = new Secret({
//   secret: newSecret
// });
// secret.save();

});








app.get("/logout", function(req,res){
  req.logout();
  res.redirect("/");
});




app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
