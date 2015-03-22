angular.module('shapyScreenshot', ['ngCookies', 'ui.bootstrap'])
  .controller('ScreenshotCtrl', function($scope, $modal, $log) {
    $scope.text = "I made it";

    $scope.open = function() {
      var modalInstance = $modal.open({
        templateUrl: 'screenshotWindow.html',
        controller: 'sharpyScreenshot'
        size: size,
      })
    
  }
