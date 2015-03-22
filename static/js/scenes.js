

angular.module('shapyScenes', [])
  .controller('ScenesController', function($http) {
    this.scenes = [];
    $http.get('/v1/scenes')
      .success(function(scenes) {
        this.scenes = scenes;
      }.bind(this));
  })
  .filter('random', function () {
    return function(limit) {
      return 10 + Math.floor(Math.random() * limit);
    };
  });