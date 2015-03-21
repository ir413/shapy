var express = require('express');
var path = require('path');


// HTTP static files & REST API.
{
  var app = express();
  app.get('/v1/scenes', function(req, res) {
    res.send('[{"id": 1}, {"id": 2}]');
  });
  app.use(express.static(path.join(__dirname, 'static')));
  app.listen(8000);
}
