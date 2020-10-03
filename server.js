const path = require("path");
const http = require("http");
const express = require("express");
const firebase = require("firebase")
const socketio = require("socket.io");
const key = "mongodb key";
var mongoClient = require("mongodb").MongoClient;
mongoClient.connect(key, (err, db)=> {
  
    console.log("Its Connected!")
    db.close();
});

const app = express();
const session = require("express-session");
const server = http.createServer(app);
const io = socketio(server);
const formatMessage = require('./utils/messages.js');
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users.js');

var userProfile;

//set static folder
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');


//Run when a client connects
io.on('connection', socket => {

    socket.on('joinRoom', ({username, room}) => {
        const user = userJoin(socket.id, username, room);
        socket.join(user.room);

        //welcome currnet user
        socket.emit('message', formatMessage('Jaarvis', 'Welcome to Starky!'));
       
        //Broadcast when a user connects
        socket.broadcast.to(user.room).emit('message', formatMessage('Jaarvis', `Sir ${user.username} has joined the chat`));
  
          //Send users and room info
        io.to(user.room).emit('roomUsers', {
            room:user.room,
            users: getRoomUsers(user.room)
        });
    });
   
    //Listen for chatMessage
    socket.on('chatMessage', (msg) => {
        const user = getCurrentUser(socket.id);
        io.to(user.room).emit(
            'message',
            formatMessage(user.username, msg));
    });

       //Runs when client disconnects
       socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if(user){
            io.to(user.room).emit('message', formatMessage('Jaarvis', `Sir, ${user.username}  has left the chat`));
            

            //Send users and room info
            io.to(user.room).emit('roomUsers', {
                room:user.room,
                users: getRoomUsers(user.room)
            });
        };

    });

});

// sign up bhasad start here 

app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: 'SECRET' 
}));


app.get("/", function (req, res) {
  console.log(req.session.user)
  if(req.session.user)
    res.render("index");
  else res.redirect("/login");
});

 
app.get("/signup", function (req, res) {
  console.log(req.session.user)
  if(req.session.user)
    res.redirect("/");
  else 
   res.render("sign-up");
});


app.get("/login", function (req, res) {
  console.log(req.session.user)
  if(req.session.user)
    res.redirect("/");
  else 
   res.render("login");
});

/*  PASSPORT SETUP  */

const passport = require('passport');
var userProfile;

app.use(passport.initialize());
app.use(passport.session());



app.get('/success', (req, res) => {
  req.session.user = userProfile;
  res.redirect("/");
});
app.get('/error', (req, res) => res.send("error logging in"));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});


/*  Google AUTH  */
 
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const GOOGLE_CLIENT_ID = 'Apni key daalo';
const GOOGLE_CLIENT_SECRET = 'Apni Secret key daalo';
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://sandesh-vitaran.azurewebsites.net/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
      userProfile = profile;
      return done(null, userProfile);
  }
));

app.get('/auth/google', 
  passport.authenticate('google', { scope : ['profile', 'email'] }));
 
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/error' }),
  function(req, res) {
    // Successful authentication, redirect success.
    res.redirect('/success');
  });




const PORT = 8080 || process.env.PORT;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
