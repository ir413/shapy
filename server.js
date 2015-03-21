var express = require('express');
var path = require('path');
var ws = require('ws');

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


// HTTP static files & REST API.
{
  var app = express();
  app.use(express.static(path.join(__dirname, 'static')));
  app.listen(8000);
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