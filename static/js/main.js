


var shapy = angular.module('shapy', ['ngRoute', 'shapyEditor', 'shapyScenes'])


shapy.directive('shapyLogin', function() {
    return {
      restrict: 'E',
      link: function($scope, $elem, $attrs) {
        console.log('link');
      }
    };
  });


shapy.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'main.html',
        controller: 'MainController',
      })
      .when('/scenes', {
        templateUrl: 'scenes.html',
        controller: 'ScenesController'
      })
      .when('/editor', {
        templateUrl: 'editor.html',
        controller: 'EditorController'
      })
      .otherwise({
        redirectTo: '/'
      });
  }]);

shapy.controller('MainController', function() {
    console.log('main!');
  });
