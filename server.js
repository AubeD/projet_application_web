var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent'), // Permet de bloquer les caractères HTML (sécurité équivalente à htmlentities en PHP)
    fs = require('fs');

// Chargement de la page index.html
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/chat.html');
});

io.sockets.on('connection', function (socket, pseudo) {
    // Dès qu'on nous donne un pseudo, on le stocke en variable de session et on informe les autres personnes
    socket.on('nouveau_client', function(pseudo) {
        //pseudo = ent.encode(pseudo);
        socket.pseudo = pseudo;
        socket.room="room1";
        socket.join("room1");
        socket.emit('notification', 'you have connected to room1');
        socket.broadcast.to('room1').emit('notification', pseudo+" s'est connecte");

    });

    // Dès qu'on reçoit un message, on récupère le pseudo de son auteur et on le transmet aux autres personnes
    socket.on('message', function (message) {
        message = ent.encode(message);
        socket.broadcast.to(socket.room).emit('message', {pseudo: socket.pseudo, message: message});
    }); 

    socket.on('rejoindre_room', function (room) {
        socket.leave(socket.room);
        socket.join(room);
        socket.broadcast.to(socket.room).emit('notification', socket.pseudo+' has left this room');
        socket.room=room;
        socket.emit('notification', 'you have connected to '+socket.room);
        socket.broadcast.to(socket.room).emit('notification', socket.pseudo+' a rejoint cette room');
    }); 

    socket.on('disconnect', function(){
        socket.broadcast.to(socket.room).emit('notification', socket.pseudo+" s'est deconnecte.");
    });
});

server.listen(8080);