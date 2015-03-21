var express = require('express');
var path = require('path');
var ws = require('ws');
var FacebookStrategy = require('passport-facebook').Strategy;
var session = require('express-session');
var config = require('./config');
var passport = require('passport');

/**
 * Authenticated user.
 */
function User(name) {
  this.name = name;
  this.token = 'token';
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
  app.get('/v1/scenes', function(req, res) {
    res.send('[{"id": 1}, {"id": 2}]');
  });
  app.use(express.static(path.join(__dirname, 'static')));
  app.use(passport.initialize());
  app.use(passport.session());
  app.listen(8000);
  // Go to authentification link
  app.get('/auth/facebook', passport.authenticate('facebook'));

  // Callback function after Facebook login
  app.get('/auth/facebook/callback',
      passport.authenticate('facebook', {
        successRedirect : '/',
        failureRedirect : '/login'
      }),
      function(req, res) {
        res.redirect('/');
      });

  // Ensure the user is authenticated. If not, redirect to login
  function ensureAuthenticated(req, res, next) {
    if(req.isAuthenticated()) {
      return next();
    }

    req.redirect('/login');
  }
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
        Scene.all = new Scene[sceneId];
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
        default: {
          console.log('%s: invalid "%s"', data.type);
          break;
        }
      }
    }

    ws.on('close', function() {
      if (!user) {
        return;
      }

      // Remove the user from the scene.
      

      // Kill the connection.
      if (user.conn) {
        user.conn.terminate();
        user.conn = null;
      }
    });
  });
}
