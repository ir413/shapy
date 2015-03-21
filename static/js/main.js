


var shapy = angular.module('shapy', ['ngRoute', 'shapyEditor'])


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
    $routeProvider.
      when('/', {
        templateUrl: 'main.html',
        controller: 'EditorController'
      }).
      when('/editor', {
        templateUrl: 'editor.html',
        controller: 'EditorController'
      }).
      otherwise({
        redirectTo: '/'
      });
  }]);
