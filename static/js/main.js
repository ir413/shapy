


angular.module('shapy', ['ngRoute', 'shapyEditor'])
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
    $routeProvider.
      when('/', {
        templateUrl: 'main.html',
        controller: 'EditorController'
      }).
      when('/editor/:sceneID', {
        templateUrl: 'editor.html',
        controller: 'EditorController',
        controllerAs: 'editorCtrl'
      }).
      otherwise({
        redirectTo: '/'
      });
  }]);
