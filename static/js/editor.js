var ZOOM_SPEED = 0.2;
var ROTATION_SCALE = 1;

angular.module('shapyEditor', [])
  .directive('shapyCanvas', function() {
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

        // Camera parameters.
        var cameraDir = new THREE.Vector3(0, 0, -1);
        var cameraPos = new THREE.Vector3(0, 0, 0);
        var cameraRot = new THREE.Vector3(0, 0, 0);
        var cameraZoom = 4.31;

        function updateRot(dx, dy) {
          console.log(dx, dy);
        }

        function updateCamera() {
          var dir = cameraDir.clone();
          dir.multiplyScalar(Math.pow(1.1, cameraZoom));
          dir.sub(cameraPos).negate();
          camera.position.copy(dir);
          camera.lookAt(cameraPos);
        }

        // Create the renderer.
        var renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        $elem.append(renderer.domElement);

        // Thee.js example test.
        camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
        updateCamera();

        scene = new THREE.Scene();

        var geometry = new THREE.BoxGeometry(1, 1, 1 );

        mesh = new THREE.Mesh( geometry );
        scene.add( mesh );

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
        });

        // Detect mouse up.
        $elem.on('mouseup', function(event) {
          isMouseDown = false;
        });

        // Detect mouse position.
        $elem.on('mousemove', function(event) {
          // Update rotation if mouse is down.
          if (isMouseDown) {
            updateRot(event.pageX - onMouseDownX, event.pageY - onMouseDownY);
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
      }
    }
  })
  .controller('EditorController', function($routeParams, $location) {
    this.sceneID = $routeParams['sceneID'];
    this.items = ['a', 'c', 'd'];

    // Open up the websockets connection.
    var sock = new WebSocket("ws://localhost:8001");
    sock.onopen = function() {
      sock.send(JSON.stringify({
        token: 'token',
        scene: 'scene'
      }));

      sock.onmessage = function(msg) {
        var data;

        try {
          data = JSON.parse(msg);
        } catch (e) {
          $location.path('/');
          return;
        }

        sock.send('{"type": "lol"}');
        sock.onmessage = function(msg) {
          console.log('recv');
        }
      };
    };

    sock.onclose = function() {
      console.log('close!');
    };
  });

