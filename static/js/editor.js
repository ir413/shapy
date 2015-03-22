var ZOOM_SPEED = 0.2;
var ROT_SPEED = 0.01;
var sock, editor;



/**
 * Cube representation.
 */
function Cube(data) {
  this.id = data.id;
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
    data.rx || 0,
    data.ry || 0,
    data.rz || 0);
  this.colour = data.colour || 0x333333;
}


Cube.prototype.getData = function() {
  return {
    id: this.id, 

    px: this.pos.x,
    py: this.pos.y,
    pz: this.pos.z,

    rx: this.rot.x,
    ry: this.rot.y,
    rz: this.rot.z,

    sx: this.scale.x,
    sy: this.scale.y,
    sz: this.scale.z,

    colour: this.colour
  };
};


function Translator(object) {
  this.object = object.object;
  this.start = this.object.position.clone();
  this.cylinderX = null;
  this.cylinderY = null;
  this.cylinderZ = null;
};

Translator.prototype.add = function(scene) {
  this.scene = scene;
  // X cylinder.
  this.cylinderX = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 0.4, 1.3, 50, 50, false), 
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
  this.cylinderX.overdraw = true;
  scene.add(this.cylinderX);

  // Y cylinder
  this.cylinderY = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 0.4, 1.3, 50, 50, false), 
      new THREE.MeshBasicMaterial({ color: 0x00FF00}));
  this.cylinderY.position.set(
      this.object.data.pos.x,
      this.object.data.pos.y + this.object.data.size.y / 2 + 0.23,
      this.object.data.pos.z);
  this.cylinderY.rotation.set(
      0,
      0,
      0
    );
  this.cylinderY.overdraw = true;
  scene.add(this.cylinderY);

  // Z cylinder.  
  this.cylinderZ = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 0.4, 1.3, 50, 50, false), 
      new THREE.MeshBasicMaterial({ color: 0x0000FF}));
  this.cylinderZ.position.set(
      this.object.data.pos.x,
      this.object.data.pos.y,
      this.object.data.pos.z + this.object.data.size.z / 2 + 0.23);
  this.cylinderZ.rotation.set(
      0,
      -Math.PI / 2,
      -Math.PI / 2
    );
  this.cylinderZ.overdraw = true;
  scene.add(this.cylinderZ);
};

Translator.prototype.action = function(raycaster) {
  var i;

  this.refPoint = this.object.data.pos.clone();
  if ((i = raycaster.intersectObject(this.cylinderX)).length > 0) {
    this.startPoint = i[0].point.clone();
    this.ref = this.cylinderX;
    this.axis = 'x';
    return true;
  }
  if ((i = raycaster.intersectObject(this.cylinderY)).length > 0) {
    this.startPoint = i[0].point.clone();
    this.ref = this.cylinderY;
    this.axis = 'y';
    return true;
  }
  if ((i = raycaster.intersectObject(this.cylinderZ)).length > 0) {
    this.startPoint = i[0].point.clone();
    this.ref = this.cylinderZ;
    this.axis = 'z';
    return true;
  }

  return true;
};

Translator.prototype.move = function(raycaster, mid) {
  var ref;

  switch (this.axis) {
    case 'x': v = new THREE.Vector3(1, 0, 0); ref = this.cylinderX; break;
    case 'y': v = new THREE.Vector3(0, 1, 0); ref = this.cylinderY; break;
    case 'z': v = new THREE.Vector3(0, 0, 1); ref = this.cylinderZ; break;
  }

  var p = raycaster.ray.origin;
  var q = ref.position;
  var u = raycaster.ray.direction;

  var a = u.dot(u);
  var b = u.dot(v);
  var e = v.dot(v);

  var d = a * e - b * b;

  var r = p.clone().sub(q);
  var c = u.dot(r);
  var f = v.dot(r);

  var s = (b*f - c*e) / d;
  var t = (a*f - b*c) / d;

  var p1 = p.clone().add(u.clone().multiplyScalar(s));
  var p2 = q.clone().add(v.clone().multiplyScalar(t));
  /*
  console.log(p1, p2);

  var i = raycaster.intersectObject(ref);
  if (i.length <= 0) {
    return false;
  }*/

  var off;
  switch (this.axis) {
    case 'x': {
      off = new THREE.Vector3(
        p2.x - this.startPoint.x,
        0,
        0);
      break;
    }
    case 'y': {
      off = new THREE.Vector3(
        0,
        p2.y - this.startPoint.y,
        0);
      break;
    }
    case 'z': {
      off = new THREE.Vector3(
        0,
        0,
        p2.z - this.startPoint.z);
      break;
    }
  }

  //console.log(p2.y - this.startPoint.y);


  off.add(this.refPoint);
  var diff = off.clone().sub(this.object.data.pos);
  sock.send(JSON.stringify({
    'type': '3d-translate',
    'id': this.object.data.id,
    'tx': diff.x,
    'ty': diff.y,
    'tz': diff.z
  }));
  this.object.data.pos.copy(off);

  this.remove(this.scene);
  this.add(this.scene);

  return true;
};

Translator.prototype.remove = function(scene) {
  this.scene = scene;
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
  this.object = object.object;
  this.start = this.object.position.clone();
  this.cubeX = null;
  this.cubeY = null;
  this.cubeZ = null;
};

Scaler.prototype.add = function(scene) {
  this.scene = scene;
  // Add cubeX
  this.cubeX = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), 
                              new THREE.MeshBasicMaterial({ color: 0xFF0000}));
  this.cubeX.position.set(
      this.object.data.pos.x + this.object.data.size.x / 2 + 0.23,
      this.object.data.pos.y,
      this.object.data.pos.z);
  this.cubeX.rotation.set(
      0,
      0,
      0
    );
  this.cubeX.overdraw = true;
  scene.add(this.cubeX);  

  // Add cubeY
  this.cubeY = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), 
                              new THREE.MeshBasicMaterial({ color: 0x00FF00}));
  this.cubeY.position.set(
      this.object.data.pos.x,
      this.object.data.pos.y + this.object.data.size.y / 2 + 0.23,
      this.object.data.pos.z);
  this.cubeY.rotation.set(
      0,
      0,
      0
    );
  this.cubeY.overdraw = true;
  scene.add(this.cubeY);    

  // Add cubeZ
  this.cubeZ = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), 
                              new THREE.MeshBasicMaterial({ color: 0x0000FF}));
  this.cubeZ.position.set(
      this.object.data.pos.x,
      this.object.data.pos.y,
      this.object.data.pos.z + this.object.data.size.z / 2 + 0.23);
  this.cubeZ.rotation.set(
      0,
      0,
      0
    );
  this.cubeZ.overdraw = true;
  scene.add(this.cubeZ);   
};

Scaler.prototype.action = function(raycaster) {
  var i;

  this.refPoint = this.object.data.pos.clone();
  if ((i = raycaster.intersectObject(this.cubeX)).length > 0) {
    this.startPoint = i[0].point.clone();
    this.ref = this.cubeX;
    this.axis = 'x';
    return true;
  }
  if ((i = raycaster.intersectObject(this.cubeY)).length > 0) {
    this.startPoint = i[0].point.clone();
    this.ref = this.cubeY;
    this.axis = 'y';
    return true;
  }
  if ((i = raycaster.intersectObject(this.cubeZ)).length > 0) {
    this.startPoint = i[0].point.clone();
    this.ref = this.cubeZ;
    this.axis = 'z';
    return true;
  }

  return true;
};

Scaler.prototype.move = function(raycaster, mid) {
var ref;

  switch (this.axis) {
    case 'x': ref = this.cubeX; break;
    case 'y': ref = this.cubeY; break;
    case 'z': ref = this.cubeZ; break;
  }

  var i = raycaster.intersectObject(ref);
  if (i.length <= 0) {
    return false;
  }

  var off;
  switch (this.axis) {
    case 'x': {
      off = new THREE.Vector3(
        i[0].point.x - this.startPoint.x,
        0,
        0);
      break;
    }
    case 'y': {
      off = new THREE.Vector3(
        0,
        i[0].point.y - this.startPoint.y,
        0);
      break;
    }
    case 'z': {
      off = new THREE.Vector3(
        0,
        0,
        i[0].point.z - this.startPoint.z);
      break;
    }
  }
  
  //console.log(this.object.data);

  console.log(this.object.data.size.x);

  off.add(this.refPoint);
  var diff = off.clone().sub(this.object.data.pos);
  sock.send(JSON.stringify({
    'type': '3d-scale',
    'id': this.object.data.id,
    'sx': this.object.data.size.x + diff.x,
    'sy': this.object.data.size.y + diff.y,
    'sz': this.object.data.size.z + diff.z
  }));

  this.object.data.size.x += diff.x;
  this.object.data.size.y += diff.y;
  this.object.data.size.z += diff.z;

  console.log(cubeMap[this.object.data.id]);

  this.remove(this.scene);
  this.add(this.scene);

  return true;
};

Scaler.prototype.remove = function(scene) {
  this.scene = scene;
  if (this.cubeX) {
    scene.remove(this.cubeX);
    this.cubeX = null;
  }

  if (this.cubeY) {
    scene.remove(this.cubeY);
    this.cubeY = null;
  }

  if (this.cubeZ) {
    scene.remove(this.cubeZ);
    this.cubeZ = null;
  }    
};



/**
 * Mapping between our cubes and meshes.
 */
cubeMap = {};

angular.module('shapyEditor', ['ngCookies', 'ui.bootstrap', 'shapyScreenshot'])
  .directive('shapyCanvas', function($rootScope, $modal) {
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
        var isMouseDragging = false;
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
        renderer = new THREE.WebGLRenderer({
            preserveDrawingBuffer : true
        });

        renderer.setSize(window.innerWidth, window.innerHeight - 40);
        renderer.setClearColor(0xcccccc, 1);
        $elem.append(renderer.domElement);

        // Set the camera.
        camera = new THREE.PerspectiveCamera(
            45, 
            renderer.domElement.width / renderer.domElement.height, 
            0.1, 1000 );
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

          // Check if markers were clicked.
          if (editor && editor.action(raycaster)) {
            isMouseDragging = true;
            isMouseDown = false;
            return;
          } else if (editor) {
            editor.remove(scene);
            editor = null;
          }

          // Get the objects.
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
          var colour = selected.object.material.color;
          selected.object.material.color.copy(colour.multiplyScalar(1.3));
        });

        // Detect mouse up.
        $elem.on('mouseup', function(event) {
          isMouseDown = false;
          isMouseDragging = false;
          if (editor) {
            editor.move(raycaster, false);
            editor.remove(scene);
            editor = null;
          }
        });

        // Detect mouse position.
        $elem.on('mousemove', function(event) {
          // Calculate mouse position in (-1, 1)
          mouse.x = (event.pageX / renderer.domElement.width) * 2 - 1;
          mouse.y = -((event.pageY - 40) / renderer.domElement.height) * 2 + 1;

          mouse.z = 0.5;

          var vector = mouse.clone().unproject(camera);
          raycaster.set(camera.position, vector.sub( camera.position ).normalize());

          if (isMouseDragging) {
            if (editor && selected) {
              editor.move(raycaster, true);
              update();
              return;
            }
          }

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
            case 99: {
              if (!selected) {
                break;
              }
              var sel = selected;
              var modal = $modal.open({
                templateUrl: 'colour.html',
                controller: function(selected) {
                  this.r = (selected.object.data.colour >> 16) & 0xFF;
                  this.g = (selected.object.data.colour >>  8) & 0xFF;
                  this.b = (selected.object.data.colour >>  0) & 0xFF;

                  $scope.$watch(function() {
                    var r = parseInt(this.r);
                    var g = parseInt(this.g);
                    var b = parseInt(this.b);

                    var mask = ((r & 0xFF) << 16) | ((g & 0xFF) << 8) | (b & 0xFF);
                    selected.object.data.colour = mask;
                    $rootScope.$emit('change');
                  }.bind(this));
                  this.close = function() {
                    modal.close();
                  };
                },
                controllerAs: 'colourCtrl',
                size: 'sm',
                resolve: {
                  selected: function () {
                    return sel;
                  }
                }
              });
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

        function update() { 
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
                  new THREE.BoxGeometry(1, 1, 1), 
                  new THREE.MeshLambertMaterial( {color: cube.colour } ) 
                );
              cubeMap[cube.id].data = cube;
              scene.add(cubeMap[cube.id]);
            }
            cubeMap[cube.id].scale.copy(cube.size);
            cubeMap[cube.id].position.copy(cube.pos);
          }

          // Remove the deleted cubes from the cubeMap
          for (var cubeId in cubeMap) {
            if (!(cubeId in $scope.items)) {
              scene.remove(cubeMap[cubeId]);
              delete cubeMap[cubeId];
            }
          }

          if (selected) {
            selected.object.material.color.set(selected.object.data.colour);
          }
        };

        $rootScope.$on('change', update);
        $scope.$emit('change');
      }
    }
  })
  .controller('EditorController', function($rootScope, $routeParams, $location, $modal, $http, user) {
    var nextID = 2;

    this.sceneID = $routeParams['sceneID'];
    this.items = {};

    this.addCube = function() {
      var id = Math.floor(Math.random() * 1000000);
      this.items[id] = new Cube({id: id});
      sock.send(JSON.stringify({
        'type': 'obj-create',
        'data': this.items[id].getData()
      }));
      $rootScope.$emit('change');
    };

    this.snapshot = function() {
        var name = Math.floor(Math.random() * 1000) + '';
        var data = renderer.domElement.toDataURL("image/png");
        $http.post('/v1/screenshot', { data: data, name: name })
          .success(function() {
            $modal.open({
              templateUrl: 'screenshot.html',
              controller: 'ScreenshotCtrl',
              controllerAs: 'screenCtrl',
              size: 'lg',
              resolve: {
                items: function () {
                  return user;
                },
                name: function() {
                  return name;
                },
                data: function() {
                  return data;
                }
              }
            })
          });
    };

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
          data = JSON.parse(msg.data);
        } catch (e) {
          console.log(e, msg.data);
          return;
        }

        switch (data.type) {
          case 'scene': {
            for (var i in data.scene.objs) {
              this.items[data.scene.objs[i].id] = new Cube(data.scene.objs[i]);
            }
            break;
          }
          case 'obj-create': {
            this.items[data.data.id] = new Cube(data.data);
            break;
          }
          case '3d-translate': {
            var item = this.items[data.id];
            item.pos.x += data.tx;
            item.pos.y += data.ty;
            item.pos.z += data.tz;
            break;
          }
        }
        $rootScope.$emit('change');
      }.bind(this);
    }.bind(this);

    sock.onclose = function() {
      console.log('close!');
    };
  });

