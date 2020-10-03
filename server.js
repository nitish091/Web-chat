const path = require("path");
const http = require("http");
const express = require("express");
const firebase = require("firebase")
const socketio = require("socket.io");
const key = "mongodb://webchat:CaiYcao0xKk1kk5xxmlsGJyEFzm8b7QTQnRZ3RKAKE4453F74vmryjtdoaor275dIK7xoKLSfXfFEh5fZuH2pA==@webchat.mongo.cosmos.azure.com:10255/?ssl=true&appName=@webchat@";
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

// app.configure(function(){
//   app.use(express.cookieDecoder());
//   app.use(express.session({ store: new AzureSessionStore({ name: "webchat1", accessKey: "rrnGzIjEvCPF11DY6gs0LP2eOf6zXp4Z0gpFg89QGXRlBkVekGO96BRGPn3M7MkonVdwzWICcIhwqViRy9Cbvg==" }) }));
// });

// // Authentication

// var actionCodeSettings = {
//   // URL you want to redirect back to. The domain (www.example.com) for this
//   // URL must be whitelisted in the Firebase Console.
//   url: 'https://www.example.com/finishSignUp?cartId=1234',
//   // This must be true.
//   handleCodeInApp: true,
//   iOS: {
//     bundleId: 'com.example.ios'
//   },
//   android: {
//     packageName: 'com.example.android',
//     installApp: true,
//     minimumVersion: '12'
//   },
//   dynamicLinkDomain: 'example.page.link'
// };


// firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings)
//   .then(function() {
//     // The link was successfully sent. Inform the user.
//     // Save the email locally so you don't need to ask the user for it again
//     // if they open the link on the same device.
//     window.localStorage.setItem('emailForSignIn', email);
//   })
//   .catch(function(error) {
//     // Some error occurred, you can inspect the code: error.code
//   });

//   // Confirm the link is a sign-in with email link.
// if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
//   // Additional state parameters can also be passed via URL.
//   // This can be used to continue the user's intended action before triggering
//   // the sign-in operation.
//   // Get the email if available. This should be available if the user completes
//   // the flow on the same device where they started it.
//   var email = window.localStorage.getItem('emailForSignIn');
//   if (!email) {
//     // User opened the link on a different device. To prevent session fixation
//     // attacks, ask the user to provide the associated email again. For example:
//     email = window.prompt('Please provide your email for confirmation');
//   }
//   // The client SDK will parse the code from the link for you.
//   firebase.auth().signInWithEmailLink(email, window.location.href)
//     .then(function(result) {
//       // Clear email from storage.
//       window.localStorage.removeItem('emailForSignIn');
//       // You can access the new user via result.user
//       // Additional user info profile not available via:
//       // result.additionalUserInfo.profile == null
//       // You can check if the user is new or existing:
//       // result.additionalUserInfo.isNewUser
//     })
//     .catch(function(error) {
//       // Some error occurred, you can inspect the code: error.code
//       // Common errors could be invalid email and invalid or expired OTPs.
//     });
// }



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
const GOOGLE_CLIENT_ID = '616522288131-6k9df414suiqnt7hga32b47a9e20lmrq.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = 'aNwCAfVA0T-CxImQlHSlJRCy';
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