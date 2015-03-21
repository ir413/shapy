var express = require('express');
var path = require('path');


// HTTP static files & REST API.
{
  var app = express();
  app.use(express.static(path.join(__dirname, 'static')));
  app.listen(8000);
}
