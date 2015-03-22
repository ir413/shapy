var express = require('express');
var path = require('path');
var ws = require('ws');
var FacebookStrategy = require('passport-facebook').Strategy;
var session = require('express-session');
var config = require('./config');
var passport = require('passport');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('shapy.db');

/**
 * Authenticated user.
 */
function User(id, name, token) {
  this.id = id;
  this.name = name;
  this.token = token;
  this.conn = null;
  this.scene = null;
}

/**
 * Map of tokens to users.
 */
User.all = { 'token': new User('Jeff') };


/** 
 * Object representing a 3D scene that can be edited.
 */
function Scene(id) {
  this.id = id;
  this.users = [];
}

/**
 * Returns serializable information.
 */
Scene.prototype.getData = function() {
  return {
    id: this.id,
    users: this.users.map(function(user) {
      return user.name;
    })
  }
};


/**
 * Active scenes in memory.
 */
Scene.all = { 'scene': new Scene('scene') };


// Set up the database.
{
  db.serialize(function() {
    db.run(
        "CREATE TABLE IF NOT EXISTS " +
        "scenes" +
          "( id INTEGER PRIMARY KEY" +
          ", scenename TEXT" +
          ", data BLOB" +
          ", owner INTEGER" +
          ")");

    db.run(
        "CREATE TABLE IF NOT EXISTS " +
        "users" +
          "( id INTEGER PRIMARY KEY" +
          ", username TEXT" +
          ")");
    
    var stmt = db.prepare("INSERT OR IGNORE INTO scenes VALUES (?, ?, ?, ?)");
    stmt.run(1, 'Example scene', '{}', 878431572216494);
    stmt.run(2, 'City of cubes', '{}', 878431572216494);
    stmt.run(3, 'Model of Ilija\'s thought process', '{}', 10203913346743504);
    stmt.finalize();

    var stmt = db.prepare("INSERT OR IGNORE INTO users VALUES (?, ?)");
    stmt.run(878431572216494, 'RaduSzasz');
    stmt.run(10203913346743504, 'MichałSienkiewicz');
    stmt.finalize();
  });
}

// Configure passport.
{
  passport.serializeUser(function(user, done) {
    done(null, user);
  });

  passport.deserializeUser(function(obj, done) {
    done(null,obj);
  });

  // Use Facebook strategy within Passport
  passport.use(new FacebookStrategy({
      clientID      : config.facebook_api_key,
      clientSecret  : config.facebook_api_secret,
      callbackURL   : config.callback_url
    },
    function(accessToken, refreshToken, profile, done) {
      done(null, profile);
    }));
}


// HTTP static files & REST API.
{
  var app = express();
  app.use(session({
      secret: 'keyboard cat',
      resave: false,
      rolling: true,
      saveUninitialized: false,
      maxAge: 3600000
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(express.static(path.join(__dirname, 'static')));
  app.listen(8000);

  // Returns the list of available scenes.
  app.get('/v1/scenes', function(req, res) {
    var result = [];
    db.all(
        "SELECT scenes.id, scenes.scenename, users.username " +
        "FROM scenes " +
        "JOIN users " +
        "WHERE users.id = scenes.owner", 
        function(err, rows) {
          for (var index in rows) {
            var row = rows[index];
            result.push({
              id: row.id,
              scenename: row.scenename,
              owner: row.username
            });
          }
          res.send(JSON.stringify(result));
        });
  });

  // Go to authentification link
  app.get('/auth/facebook', passport.authenticate('facebook'));

  // Callback function after Facebook login
  app.get('/auth/facebook/callback', passport.authenticate('facebook', {
      successRedirect : '/',
      failureRedirect : '/login'
    }));

  // Link to retrieve user info.
  app.get('/auth/info', function(req, res) {
    if (!req.isAuthenticated()) {
      res.statusCode = 500;
      res.send(JSON.stringify({
        success: false
      }));
    } else {
      // TODO: choose a better token.
      var token = req.user.id;
      var id = req.user.id;
      var name = req.user.name.givenName + req.user.name.familyName;
      User.all[token] = new User(id, name);
      var stmt = db.prepare("INSERT OR IGNORE INTO users VALUES (?, ?)");
      stmt.run(id, name);
      stmt.finalize();

      res.send(JSON.stringify({
        success: true,
        id: req.user.id,
        name: req.user.name.givenName + req.user.name.familyName,
        token: token
      }));
    }
  });
}


// WebSocket server.
{
  var srv = new ws.Server({ port: 8001 });

  srv.on('connection', function(ws) {
    var user, scene;

    /** 
     * Handles the first auth message.
     */
    var onAuthMessage = function(msg) {
      var data, token, sceneId;

      ws.removeListener('message', onAuthMessage);
      ws.on('message', onMessage);

      // Extract token & scene id.
      try {
        data = JSON.parse(msg);
        token = data['token'];
        sceneId = data['scene'];
      } catch (e) {
        console.log('%s: invalid', token);
        return;
      }

      // Validate user by token.
      if (token in User.all) {
        console.log('%s: connect', token);
        user = User.all[token];
      } else {
        console.log('%s: invalid', token);
        ws.terminate();
        return;
      }

      // Validate the scene or create a new one.
      if (!(sceneId in Scene.all)) {
        // Create a new scene & assign it to the user.
        Scene.all[sceneId] = new Scene(sceneId);
      }

      // Add user to the scene.
      scene = Scene.all[sceneId];
      user.scene = scene;
      scene.users.push(user);

      // Set the user's connection.
      if (user.conn != null) {
        console.log('%s: duplicate', token);
        ws.send(JSON.stringify({
          type: 'duplicate'
        }));
        return;
      }
      user.conn = ws;

      // Send a message indicating a successfull connection.
      ws.send(JSON.stringify({
        type: 'scene',
        scene: scene.getData()
      }));
      console.log(scene.getData());
    }
    ws.on('message', onAuthMessage);

    /**
     * Handles an incoming message.
     */
    var onMessage = function(msg) {
      var data;

      if (!user || !scene) {
        console.log('%s: invalid user/scene', user ? user.token : null);
      }

      try {
        data = JSON.parse(msg); 
      } catch (e) {
        console.log('%s: malformed "%s"', user.token, msg);
      }

      switch (data.type) {
        case '3d-rotate': {
          break;
        }
        case '3d-translate': {
          break;
        }
        case '3d-scale': {
          break;
        }
        case 'obj-create': {
          break;
        }
        case 'obj-delete': {
          break;
        }
        default: {
          console.log('%s: invalid "%s"', user.token, data.type);
          break;
        }
      }
    }

    ws.on('close', function() {
      if (!user) {
        return;
      }

      // Remove the user from the scene.
      user.scene.users.splice(user.scene.users.indexOf(user), 1);

      // Kill the connection.
      if (user.conn) {
        user.conn.terminate();
        user.conn = null;
      }
    });
  });
}
