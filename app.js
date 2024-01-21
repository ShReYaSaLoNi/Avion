const express = require("express");
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mysql = require('mysql');
const flash = require('express-flash');
require("dotenv").config();


const app = express();

const db = mysql.createConnection({
    host: "localhost",
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
  });

db.connect(function(err) {
    if (err) throw err;
    console.log("Connected from Database");
});

app.use(express.static("public"));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());


app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true
  }));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());
  
passport.use(new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'emailId',
        passwordField : 'password'
        //passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    (emailId, password, done) => {
      // Replace with your MySQL query to check credentials
      db.query('SELECT * FROM usercontact WHERE emailId = ?', [emailId], (err, rows) => {
        if (err) return done(err);
        console.log(rows);
        if (!rows.length) {
          return done(null, false, { message: 'Incorrect Email.' });
        }
  
        const user = rows[0];
        if (user.password !== password) {
          return done(null, false, { message: 'Incorrect password.' });
        }
  
        return done(null, user);
      });
    }
  ));

passport.serializeUser((users, done) => {
    console.log('Inside Serialize');
    recentUser=users.username;
    console.log(recentUser);
    done(null, users.passengerId);
});
  
passport.deserializeUser((id, done) => {
    // Replace with your MySQL query to fetch user by id
    console.log("Inside Deserialize");
    db.query('SELECT * FROM usercontact WHERE passengerId = ?', [id], (err, rows) => {
      done(err, rows[0]);
    });
  });

var flights=[];
var amount=[];
var count=[];
var route=[];
var recentUser;
var TicketData;
var UserData;

app.get('/',(req,res)=>{
    res.render('home');
})

app.get('/user',(req,res)=>{
  res.render('user');
})

app.get('/login',(req,res)=>{
    res.render('login');
})

app.post('/login', passport.authenticate('local', {
    successRedirect: '/user',
    failureRedirect: '/login',
    failureFlash: true
  }));


app.get('/signup',(req,res)=>{
    res.render('signUp');
})


app.post('/signup', (req, res) => {
    console.log(req.body);
    const {username, address, email, phone, password}= req.body;
    db.query('INSERT INTO usercontact (username, address, emailId, phoneNo, password) VALUES (?, ?, ?, ?, ?)', [username, address, email, phone, password], (err, result) => {
        if (err) {
            console.error(err);
            return res.redirect('/signup');
        }

        db.query('INSERT INTO login (emailId,password) VALUES (?,?)',[email,password]);
        res.redirect('/');
    });
  });  
  

app.get('/dashboard',(req,res)=>{
    res.render('dashboard');
})
app.get('/airlines',(req,res)=>{
    res.render('airlines');
})

app.post('/airlines',(req,res)=>{
  flights=[],amount=[],route=[],count=[];
    var airport = req.body.flight;
    var destination = req.body.flightTo;
    console.log(airport,destination);
    db.query('SELECT * FROM aircrafts ar INNER JOIN routes r ON r.routeCode = ar.routeCode WHERE (r.airport=? AND r.destination=?)',[airport,destination],(err,rows)=>{
        if (err) return(err);
        console.log(rows);
        count.push(rows.length);
        console.log(count);
        rows.forEach((row)=>{
            var id = row.aircraftId;
            db.query('SELECT af.amount,ar.aircraftName, ar.routeCode FROM airfare af INNER JOIN aircrafts ar ON ar.aircraftId = af.aircraftId WHERE ar.aircraftId=?',[id],(err,amtrows)=>{
                if (err) return(err);
                console.log(amtrows);
                amtrows.forEach((amtrow)=>{
                    flights.push(amtrow.aircraftName);
                    amount.push(amtrow.amount);
                    route.push(amtrow.routeCode);
                })
            })
        })
        res.redirect('/flights'); //The order matters, here I have put after each row has been visited.
    })
})

app.get('/flights',(req,res)=>{
    console.log(flights);
    console.log(amount);
    res.render('flight',{airplaneName:flights,amounts:amount,count:count,routeCode:route});
})

app.get('/booking',(req,res)=>{
res.render('booking',{user:UserData[0].username,email:UserData[0].emailId,address:UserData[0].address,phone:UserData[0].phoneNo,from:TicketData[0].airport,to:TicketData[0].destination});
})

app.post('/booking',(req,res)=>{
  if(req.isAuthenticated()){
    console.log(req.body);
    const Route= req.body.route;
    console.log(Route);
    //recentUser=users.body.username;
    /*
    db.query('INSERT INTO schedule (aircraftName,amount) VALUES (?,?)',[req.body.plane,req.body.amount]);

    db.query('SELECT ar.aircraftName, u.passengerId, u.username,u.emailId,u.address,u.phoneNo,r.airport, r.routeCode , r.destination FROM tickets t INNER JOIN routes r ON r.routeCode = t.routeCode INNER JOIN aircrafts ar ON ar.routeCode = r.routeCode INNER JOIN usercontact u ON u.passengerId = t.passengerId WHERE (r.routeCode=? AND ar.aircraftName=?)',[req.body.route,req.body.plane],(err,rows)=>{
    */
    db.query('SELECT * FROM usercontact WHERE username=?',[recentUser],(err,rows)=>{
      if (err) return(err);
      console.log(rows);
      UserData=JSON.parse(JSON.stringify(rows));
      console.log(UserData[0].passengerId);
    });
    db.query('SELECT r.airport, r.destination, ar.aircraftName FROM aircrafts ar INNER JOIN routes r ON r.routeCode= ar.routeCode WHERE r.routeCode=?',[Route],(err,rows)=>{
      if (err) return(err);
      TicketData=JSON.parse(JSON.stringify(rows));
      console.log(TicketData[0]);
      db.query('INSERT INTO tickets (passengerId,routeCode) VALUES (?,?)',[UserData[0].passengerId,Route]);
    })
    res.redirect('/booking');
  }
  else{
    res.redirect('/login');
  }
})

var Date;
app.get('/saved',(req,res)=>{
db.query('INSERT INTO schedule (aircraftName,airport,departure,flightDate) VALUES (?,?,?,?)',[TicketData[0].aircraftName,TicketData[0].airport,TicketData[0].destination,Date]);
res.render('ticket',{username:UserData[0].username,email:UserData[0].emailId,address:UserData[0].address,mobile:UserData[0].phoneNo,from:TicketData[0].airport,to:TicketData[0].destination,date:Date});
})

app.post('/saved',(req,res)=>{
 Date= req.body.date;
 res.redirect('/saved');
})

var allTickets=[];

app.post('/savedTickets',(req,res)=>{
  console.log(req.body.name);
  allTickets.push(req.body);
  res.redirect('/savedTickets');
})

app.get('/savedTickets',(req,res)=>{
res.render('savedTickets',{tickets:allTickets});
})

app.get('/reviews',(req,res)=>{
  res.render('review');
})

app.listen(3000, ()=> {
    console.log("Server started on port 3000");
  });