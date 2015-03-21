

angular.module('shapyScenes', [])
  .controller('ScenesController', function($http) {
    this.scenes = [];
    $http.get('/v1/scenes')
      .success(function(scenes) {
        this.scenes = scenes;
      }.bind(this));
  });