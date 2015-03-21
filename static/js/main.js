

angular.module('shapy', ['ngRoute', 'shapyEditor', 'shapyScenes'])
  .directive('shapyLogin', function() {
    return {
      restrict: 'E',
      link: function($scope, $elem, $attrs) {
        console.log('link');
      }
    };
  })
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
        controllerAs: 'sceneCtrl'
      })
      .when('/editor/:sceneID', {
        templateUrl: 'editor.html',
        controller: 'EditorController',
        controllerAs: 'editorCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  }])
  .controller('MainController', function() {
    console.log('main!');
  });
