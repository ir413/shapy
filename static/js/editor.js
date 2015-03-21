

angular.module('shapyEditor', [])
  .directive('shapyCanvas', function() {
    return {
      restrict: 'E',
      scope: {
        items: '='
      },
      link: function($scope, $elem) {
        var running = true;

        // Create the renderer.
        var renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        $elem.append(renderer.domElement);

        // Thee.js example test.
        camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
        camera.position.z = 400;

        scene = new THREE.Scene();

        var geometry = new THREE.BoxGeometry( 200, 200, 200 );

        mesh = new THREE.Mesh( geometry );
        scene.add( mesh );

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
  .controller('EditorController', function($routeParams) {
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
        console.log(msg);
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

