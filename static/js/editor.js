var ZOOM_SPEED = 0.2;
var ROT_SPEED = 0.01;

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
}

/**
 * Mapping between our cubes and meshes.
 */
cubeMap = {};

angular.module('shapyEditor', ['ngCookies', 'ui.bootstrap'])
  .directive('shapyCanvas', function($rootScope) {
    return {
      restrict: 'E',
      scope: {
        items: '='
      },
      link: function($scope, $elem) {
        var running = true;

        // Rotation vars.
        var isMouseDown = false;
        var onMouseDownX = 0;
        var onMouseDownY = 0;
        var onMouseDownRot = null;

        // Camera parameters.
        var cameraPos = new THREE.Vector3(0, 0, 0);
        var cameraRot = new THREE.Vector3(0, 0, 0);
        var cameraZoom = 4.31;

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
        var renderer = new THREE.WebGLRenderer({
            preserveDrawingBuffer : true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColorHex(0xcccccc, 1);
        $elem.append(renderer.domElement);

        // Thee.js example test.
        camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
        updateCamera();

        scene = new THREE.Scene();

        // Add subtle blue ambient lighting.
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
        });

        // Detect mouse up.
        $elem.on('mouseup', function(event) {
          isMouseDown = false;
        });

        // Detect mouse position.
        $elem.on('mousemove', function(event) {
          // Update rotation only if mouse is down.
          if (!isMouseDown) {
            return;
          }

          var dx = event.pageX - onMouseDownX;
          var dy = event.pageY - onMouseDownY;

          cameraRot.x = onMouseDownRot.x - dy * ROT_SPEED;
          cameraRot.y = onMouseDownRot.y - dx * ROT_SPEED;
           // Clamp y to [-pi/2, pi/2].
          cameraRot.x = Math.min(Math.max(-Math.PI / 2 + 0.001, cameraRot.x), Math.PI / 2 - 0.001);
          cameraRot.z = onMouseDownRot.z;
          updateCamera();
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
                  new THREE.MeshLambertMaterial( {color: 0xffffff} ) 
                );
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
    var sock = new WebSocket("ws://localhost:8001");
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

