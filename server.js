const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors');

const mongoose = require('mongoose');
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' );

var Schema = mongoose.Schema;

var exerciseSchema = new Schema({
  userId: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  description: String,
  duration: Number,
  date: {
    type: Date,
    default: Date.now()
  }
});
var Exercise = mongoose.model('Exercise', exerciseSchema);

var userSchema = new Schema({
  username: String,
});
var User = mongoose.model('User', userSchema);

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/api/exercise/users', function(req, res) {
  User.find(function(err, users) {
    if (err) console.log(err);
    else res.json(users);
  });
});

app.post('/api/exercise/add', function(req, res) {
  var newExercise = new Exercise();
  newExercise.userId = req.body.userId;
  newExercise.description = req.body.description;
  newExercise.duration = req.body.duration;
  if (req.body.date) newExercise.date = req.body.date;
  
  newExercise.save(function(err, exercise) {
    if (err) console.log(err);
    else {
      User.findById(newExercise.userId, function(err, user) {
        if (err) console.log(err);
        else {
          var obj = {};
          obj._id = user._id;
          obj.username = user.username;
          obj.description = exercise.description;
          obj.duration = exercise.duration;
          obj.date = exercise.date;
          res.json(obj);
        }
      });
    }
  });
});

app.get('/api/exercise/log', function(req, res) {
  var q = req.query;
  var id = q.userId;
  var from = q.from ? q.from : null;
  var to = q.to ? q.to : null;
  var limit = q.limit ? q.limit : 100;
  
  // I'm sure there's a better way to do this with an aggregation, but using the c9 ide means mongoDB version 2.6 because upgrading doesn't seem to work, 
  // and I need version 3.2+ to have access to aggregation conditionals
  if (from && to) {
    Exercise.find({ userId: id, date: { $gte: from }, date: { $lte: to }}).sort('-date').limit(limit).exec(function(err, data) {
      if (err) console.log(err);
      else {
        User.findById(id, function(err, user) {
          var obj = {};
          obj.username = user.username;
          obj._id = user._id;
          obj.count = data.length;
          obj.from = from;
          obj.to = to;
          obj.log = data;
          res.json(obj);
        });
      }
    });
    
  } else if (from) {
    Exercise.find({ userId: id, date: { $gte: from }}).sort('-date').limit(limit).exec(function(err, data) {
      if (err) console.log(err);
      else {
        User.findById(id, function(err, user) {
          var obj = {};
          obj.username = user.username;
          obj._id = user._id;
          obj.count = data.length;
          obj.from = from;
          obj.log = data;
          res.json(obj);
        });
      }
    });
  } else if (to) {
    Exercise.find({ userId: id, date: { $lte: to }}).sort('-date').limit(limit).exec(function(err, data) {
      if (err) console.log(err);
      else {
        User.findById(id, function(err, user) {
          var obj = {};
          obj.username = user.username;
          obj._id = user._id;
          obj.count = data.length;
          obj.to = to;
          obj.log = data;
          res.json(obj);
        });
      }
    });
  } else {
    Exercise.find({ userId: id }).sort('-date').limit(limit).exec(function(err, data) {
      if (err) console.log(err);
      else {
        User.findById(id, function(err, user) {
          var obj = {};
          obj.username = user.username;
          obj._id = user._id;
          obj.count = data.length;
          obj.log = data;
          res.json(obj);
        });
      }
    });
  }
});



app.post('/api/exercise/new-user', function(req, res) {
  var newUser = new User();
  newUser.username = req.body.username;
  newUser.save(function(err, data) {
    if (err) console.log(err);
    else res.json(data);
  });
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'});
});

// Error Handling middleware
app.use((err, req, res, next) => {
  var errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || 'Internal Server Error';
  }
  res.status(errCode).type('txt')
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 8080, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

