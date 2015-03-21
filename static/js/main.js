
/**
 * Stores information about the current user.
 */
function User(id, name, token) {
  this.id = id;
  this.name = name;
  this.token = token;
};


angular.module('shapy', ['ngRoute', 'shapyEditor', 'shapyScenes'])
  .config(['$routeProvider',
  function($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'main.html',
        controller: 'MainController',
      })
      .when('/scenes', {
        templateUrl: 'scenes.html',
        controller: 'ScenesController',
        controllerAs: 'sceneCtrl',
        resolve: {
          'user': function(shapyUsers) {
            return shapyUsers.getUser();
          }
        }
      })
      .when('/editor/:sceneID', {
        templateUrl: 'editor.html',
        controller: 'EditorController',
        controllerAs: 'editorCtrl',
        resolve: {
          'user': function(shapyUsers) {
            return shapyUsers.getUser();
          }
        }
      })
      .otherwise({
        redirectTo: '/'
      });
  }])
  .directive('shapyLogin', function() {
    return {
      restrict: 'E',
      controller: 'MainController',
      controllerAs: 'mainCtrl'
    };
  })
  .controller('MainController', function(shapyUsers) {
    shapyUsers.getUser().then(function(user) {
      this.user = user;
    }.bind(this));
  })
  .service('shapyUsers', function($q, $http) {
    this.user = null;

    this.getUser = function() {
      if (this.user) {
        var defer = $q.defer();
        defer.resolve(this.user);
        return defer.promise;
      }

      return $http.get('/auth/info')
        .then(function(data) {
          var resp = data.data;
          this.user = new User(resp.id, resp.name, resp.token);
          return this.user;
        }.bind(this));
    };
  });
