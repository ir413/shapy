var ZOOM_SPEED = 0.2;
var ROT_SPEED = 0.01;
var sock, editor;

/**
 * Cube representation.
 */
function Cube(id, data) {
  this. id = id;
  this.pos = new THREE.Vector3(
    data.px || 0, 
    data.py || 0, 
    data.pz || 0);
  this.size = new THREE.Vector3(
    data.width || 1, 
    data.height || 1, 
    data.depth || 1);
  this.scale = new THREE.Vector3(
    data.sx || 1, 
    data.sy || 1, 
    data.sz || 1);
  this.rot = new THREE.Vector3(
    data.rx || 1,
    data.ry || 1,
    data.rz || 1);
  this.colour = data.colour || 0x333333;
}


function Translator(object) {
  this.object = object.object;
  this.start = this.object.position.clone();
  this.cylinderX = null;
  this.cylinderY = null;
  this.cylinderZ = null;
};

Translator.prototype.add = function(scene) {
  console.log(this.object);

  // X cylinder.
  this.cylinderX = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 0.2, 0.4, 50, 50, false), 
      new THREE.MeshBasicMaterial({ color: 0xFF0000}));
  this.cylinderX.position.set(
      this.object.data.pos.x + this.object.data.size.x / 2 + 0.23,
      this.object.data.pos.y,
      this.object.data.pos.z);
  this.cylinderX.rotation.set(
      0,
      0,
      -Math.PI / 2
    );
  console.log(this.cylinderX.position);
  this.cylinderX.overdraw = true;
  scene.add(this.cylinderX);

  // Y cylinder
  this.cylinderY = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 0.2, 0.4, 50, 50, false), 
      new THREE.MeshBasicMaterial({ color: 0xFF0000}));
  this.cylinderY.position.set(
      this.object.data.pos.x,
      this.object.data.pos.y + this.object.data.size.y / 2 + 0.23,
      this.object.data.pos.z);
  this.cylinderX.rotation.set(
      0,
      0,
      -Math.PI / 2
    );
  console.log(this.cylinderY.position);
  this.cylinderY.overdraw = true;
  scene.add(this.cylinderY);

  // Z cylinder.  
  this.cylinderZ = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 0.2, 0.4, 50, 50, false), 
      new THREE.MeshBasicMaterial({ color: 0xFF0000}));
  this.cylinderZ.position.set(
      this.object.data.pos.x,
      this.object.data.pos.y,
      this.object.data.pos.z + this.object.data.size.z / 2 + 0.23);
  this.cylinderZ.rotation.set(
      0,
      0,
      -Math.PI / 2
    );
  console.log(this.cylinderZ.position);
  this.cylinderZ.overdraw = true;
  scene.add(this.cylinderZ);
};

Translator.prototype.remove = function(scene) {
  if (this.cylinderX) {
    scene.remove(this.cylinderX);
    this.cylinderX = null;
  }
  
  if (this.cylinderY) {
    scene.remove(this.cylinderY);
    this.cylinderY = null;
  }

  if (this.cylinderZ) {
    scene.remove(this.cylinderZ);
    this.cylinderZ = null;
  }
};



function Rotator(object) {
  this.object = object;
};

Rotator.prototype.add = function(scene) {

};

Rotator.prototype.remove = function(scene) {

};



function Scaler(object) {
  this.object = object;
};

Scaler.prototype.add = function(scene) {

};

Scaler.prototype.remove = function(scene) {

};



/**
 * Mapping between our cubes and meshes.
 */
cubeMap = {};

angular.module('shapyEditor', ['ngCookies'])
  .directive('shapyCanvas', function($rootScope) {
    return {
      restrict: 'E',
      scope: {
        items: '='
      },
      link: function($scope, $elem) {
        var running = true;

        // Mouse vars.
        var mouse = new THREE.Vector3(0, 0, 0);
        var isMouseDown = false;
        var onMouseDownX = 0;
        var onMouseDownY = 0;
        var onMouseDownRot = null;

        // Camera parameters.
        var cameraPos = new THREE.Vector3(0, 0, 0);
        var cameraRot = new THREE.Vector3(0, 0, 0);
        var cameraZoom = 4.31;

        // Raycaster.
        var raycaster = new THREE.Raycaster();

        // Selected & intersected objects.
        var selected = null;
        var intersected = null;
        var objects = null;

        function updateCamera() {
          var dir = new THREE.Vector3(
            Math.cos(cameraRot.x) * Math.sin(cameraRot.y),
            Math.sin(cameraRot.x),
            Math.cos(cameraRot.x) * Math.cos(cameraRot.y)
          );

          dir.multiplyScalar(Math.pow(1.1, cameraZoom));
          dir.sub(cameraPos).negate();
          camera.position.copy(dir);
          camera.lookAt(cameraPos);
        }

        // Create the renderer.
        var renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0xcccccc, 1);
        $elem.append(renderer.domElement);

        // Set the camera.
        camera = new THREE.PerspectiveCamera( 70, window.innerWidth / (window.innerHeight - 50), 1, 1000 );
        updateCamera();

        // Set the scene.
        scene = new THREE.Scene();

        // Add subtle white ambient lighting.
        var ambientLight = new THREE.AmbientLight(0x111111);
        scene.add(ambientLight);
    
        // Add directional lighting.
        var directionalLight = new THREE.DirectionalLight(0xffffff);
        directionalLight.position.set(2, 3, 1).normalize();
        scene.add(directionalLight);

        // Handle zooming.
        $elem.on('mousewheel', function(event) {
          var delta = event.originalEvent.wheelDelta;

          // Update zoom.
          if (delta > 0) {
            cameraZoom += ZOOM_SPEED;
          } else if (delta < 0) {
            cameraZoom -= ZOOM_SPEED;
          }

          // Update camera position.
          updateCamera();

          // Kill the event.
          event.preventDefault();
          event.stopPropagation();
          return false;
        });
  
        // Detect mouse down.
        $elem.on('mousedown', function(event) {
          isMouseDown = true;
          // Record the position of mouse down.
          onMouseDownX = event.pageX; 
          onMouseDownY = event.pageY;
          onMouseDownRot = cameraRot.clone();

          // Get the objects.
          if (editor) {
            editor.remove(scene);
            editor = null;
          }
          objects = []
          for (var cubeId in cubeMap) {
            objects.push(cubeMap[cubeId]);
            cubeMap[cubeId].material.color.set(cubeMap[cubeId].data.colour);
          }
        
          // Determine if the ray intersects any of the objects.
          var intersects = raycaster.intersectObjects(objects);
          if (intersects.length <= 0) {
            return;
          }

          selected = intersects[0];
          selected.object.material.color.set(0xff0000);
        });

        // Detect mouse up.
        $elem.on('mouseup', function(event) {
          isMouseDown = false;
        });

        // Detect mouse position.
        $elem.on('mousemove', function(event) {
          // Calculate mouse position in (-1, 1)
          mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
          mouse.y = -((event.clientY - 50) / (window.innerHeight - 50)) * 2 + 1;
          mouse.z = 0.5;

          var vector = mouse.clone().unproject(camera);
          raycaster.set(camera.position, vector.sub( camera.position ).normalize());

          // Update rotation only if mouse is down.
          if (!isMouseDown) {
            return;
          }

          var dx = event.pageX - onMouseDownX;
          var dy = event.pageY - onMouseDownY;

          cameraRot.x = onMouseDownRot.x - dy * ROT_SPEED;
          cameraRot.y = onMouseDownRot.y - dx * ROT_SPEED;

          // Clamp x to [-pi/2, pi/2].
          cameraRot.x = Math.min(Math.max(-Math.PI / 2 + 0.001, cameraRot.x), Math.PI / 2 - 0.001);
          cameraRot.z = onMouseDownRot.z;
          updateCamera();
        });

        $(window).on('keypress', function(event) {
          if (editor) {
            editor.remove(scene);
            editor = null;
          }
          switch (event.charCode) {
            case 116: {
              editor = new Translator(selected);
              editor.add(scene);
              break;
            }
            case 114: {
              editor = new Rotator(selected);
              editor.add(scene);
              break;
            }
            case 115: {
              editor = new Scaler(selected);
              editor.add(scene);
              break;
            }
          }
        });

        // Render.
        (function loop() {
          renderer.render(scene, camera);
          if (running) {
            requestAnimationFrame(loop);
          }
        })();

        // Cleanup code.
        $scope.$on('$destroy', function() {
          running = false;
        });

        $rootScope.$on('change', function() { 
          // Update the cubeMap.
          for (var key in $scope.items) {
            if (!$scope.items.hasOwnProperty(key)) {
              continue;
            }
            var cube = $scope.items[key];
            
            // Add the mapping for the cube if it is not present in the 
            // cubeMap, update otherwise.
            if (!(cube.id in cubeMap)) {
              cubeMap[cube.id] 
                = new THREE.Mesh(
                  new THREE.BoxGeometry(cube.size.x, cube.size.y, cube.size.z), 
                  new THREE.MeshLambertMaterial( {color: cube.colour } ) 
                );
              cubeMap[cube.id].data = cube;
              cubeMap[cube.id].position.copy(cube.pos.clone());
              scene.add(cubeMap[cube.id]);
            }
          }

          // Remove the deleted cubes from the cubeMap
          for (var cubeId in cubeMap) {
            if (!(cubeId in $scope.items)) {
              delete cubeMap[cubeId];
            }
          }
        });
        $scope.$emit('change');
      }
    }
  })
  .controller('EditorController', function($rootScope, $routeParams, $location, user) {
    var nextID = 2;

    this.sceneID = $routeParams['sceneID'];
    this.items = {
      0: new Cube(0,
        {px: 0, py: 0, pz: 0, width: 20, height: 0.1, depth: 20}
      ),
      1: new Cube(1,
        {px: 0, py: 0, pz: 3}
      )
    };

    this.addCube = function() {
      this.items[++nextID] = new Cube(nextID, {});
      $rootScope.$emit('change');
    }

    // Open up the websockets connection.
    sock = new WebSocket("ws://localhost:8001");
    sock.onopen = function() {
      sock.send(JSON.stringify({
        token: user.token,
        scene: this.sceneID
      }));

      sock.onmessage = function(msg) {
        var data;

        try {
          data = JSON.parse(msg);
        } catch (e) {
          //$location.path('/');
          return;
        }

        sock.send('{"type": "lol"}');
        sock.onmessage = function(msg) {
          console.log('recv');
        }
      }.bind(this);
    }.bind(this);

    sock.onclose = function() {
      console.log('close!');
    };
  });

