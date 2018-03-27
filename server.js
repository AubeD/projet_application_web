var express = require('express'),
  ent = require('ent'), // Permet de bloquer les caractères HTML
  fs = require('fs'),
  bodyParser = require('body-parser'),
  formidable = require('formidable'),
  path = require('path');

var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

// set the view engine to ejs
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'uploads')));

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(bodyParser.json());

app.get('/', function (req, res) {
  res.render('log');
});

/* app.post('/login', function (req, res) {
  console.log("/login", req.body);
  res.redirect('/chat?pseudo='+req.body.pseudo);
}); */

app.get('/chat', function (req, res) {
  console.log("req.query =" , req.query);
  res.render('chat', {pseudo: req.query.pseudo});
});


app.post('/', function (req, res) {
  if (req.url == '/fileupload') {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      res.write('File uploaded');
      res.end();
    });
  }
});

app.post('/upload', function (req, res) {

  // create an incoming form object
  var form = new formidable.IncomingForm();

  // specify that we want to allow the user to upload multiple files in a single request
  form.multiples = true;

  // store all uploads in the /uploads directory
  form.uploadDir = path.join(__dirname, '/uploads');

  // every time a file has been uploaded successfully,
  // rename it to it's orignal name
  form.on('file', function (field, file) {
    fs.rename(file.path, path.join(form.uploadDir, file.name));
  });

  // log any errors that occur
  form.on('error', function (err) {
    console.log('An error has occured: \n' + err);
  });

  // once all the files have been uploaded, send a response to the client
  form.on('end', function () {
    res.end('success');
  });

  // parse the incoming request containing the form data
  form.parse(req);

});


io.sockets.on('connection', function (socket, pseudo) {
  // Dès qu'on nous donne un pseudo, on le stocke en variable de session et on informe les autres personnes
  socket.on('nouveau_client', function (pseudo) {
    //pseudo = ent.encode(pseudo);
    socket.pseudo = pseudo;
    socket.room = "room1";
    socket.join("room1");
    socket.emit('notification', 'Vous vous êtes connecté à la room : room1');
    socket.broadcast.to('room1').emit('notification', pseudo + " s'est connecté.");

  });

  // Dès qu'on reçoit un message, on récupère le pseudo de son auteur et on le transmet aux autres personnes
  socket.on('message', function (message) {
    message = ent.encode(message);
    socket.broadcast.to(socket.room).emit('message', {
      pseudo: socket.pseudo,
      message: message
    });
  });

  socket.on('rejoindre_room', function (room) {
    socket.leave(socket.room);
    socket.join(room);
    socket.broadcast.to(socket.room).emit('notification', socket.pseudo + ' a quitté cette room');
    socket.room = room;
    socket.emit('notification', 'Vous vous êtes connecté à la room : ' + socket.room);
    socket.broadcast.to(socket.room).emit('notification', socket.pseudo + ' a rejoint cette room');
  });


  socket.on('file', function (file_name) {
    socket.broadcast.to(socket.room).emit('file', {
      pseudo: socket.pseudo,
      file_name: file_name
    });
  });


  socket.on('disconnect', function () {
    socket.broadcast.to(socket.room).emit('notification', socket.pseudo + " s'est deconnecté.");
  });


});

server.listen(8080);