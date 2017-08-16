// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

var screenWidth = 500;
var screenHeight = 300;

var availableCircles = ['p1', 'p2', 'p3', 'p4'];

var numUsers = 0;
var decidedHealth;
var userList = ['','','',''];
var key;
var userLimit = false;
var canGetDamaged = true;

var users = new Map();
users.set('p1', {user: '', x: '', y: '', angle: 0, health: decidedHealth, message: ''} );
users.set('p2', {user: '', x: '', y: '', angle: 0, health: decidedHealth, message: ''} );
users.set('p3', {user: '', x: '', y: '', angle: 0, health: decidedHealth, message: ''} );
users.set('p4', {user: '', x: '', y: '', angle: 0, health: decidedHealth, message: ''} );

console.log('\nWelcome Admin --')
server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

app.use(express.static(__dirname + '/client'));

io.on('connection', function (socket) {

    socket.emit('check username', {
        userList: JSON.stringify(userList), numUsers: numUsers
    });

    socket.on('setting health', function(data){
        decidedHealth = data.health;
        users.set('p1', {user: '', x: '', y: '', angle: 0, health: data.health, message: ''} );
        users.set('p2', {user: '', x: '', y: '', angle: 0, health: data.health, message: ''} );
        users.set('p3', {user: '', x: '', y: '', angle: 0, health: data.health, message: ''} );
        users.set('p4', {user: '', x: '', y: '', angle: 0, health: data.health, message: ''} );
    });

    var addedUser = false;

    if(numUsers == 4){
        userLimit = true
    }

    socket.on('add user', function(username){
        if (addedUser) return;
        console.log("\n'add user' is being called by " + username);
        ++numUsers;

        if(!userLimit){
            for(var u=0; u < availableCircles.length; u++){
                if(availableCircles[u] !== undefined ){
                    key = 'p'+(u+1);
                    socket.circleNum = availableCircles[u].toString();
                    delete availableCircles[u];
                    break;
                }
            }
            //make the index of the circleNum the playerNum
            var positionInList = parseInt((socket.circleNum).slice(1), 10); //could also be u value up there
            //put the username in userList
            userList.splice((positionInList - 1), 1, username);

            users.get(key).user = username;
            socket.username = users.get(key).user; //put username in socket scope
            console.log('\nWelcome ' + socket.username +'. You are player: ' + socket.circleNum);

            console.log('current number of Users: ' + numUsers+' should equal '+users.size);
            console.log(availableCircles);console.log(userList)

            users.get(socket.circleNum).x = Math.random() * (500 - 100) + 50;
            users.get(socket.circleNum).y = Math.random() * (300 - 100) + 50;

        }

        addedUser = true;
        if(numUsers == 1){ //if one user send only the user info to the client
            console.log('\nStringifieds ' + JSON.stringify(users.get(socket.circleNum)) + '\n\n');
            socket.emit('login', {
                numUsers: numUsers,
                userInfo: JSON.stringify(users.get(socket.circleNum)),
                circleNum: socket.circleNum
            });
        } else if (numUsers > 1 && numUsers <= 4){ //if multiple user send all user Obj even if empty
            console.log('\nStringifieds '+ JSON.stringify(users.get('p1')));
            console.log('Stringifieds '+ JSON.stringify(users.get('p2')));
            console.log('Stringifieds '+ JSON.stringify(users.get('p3')));
            console.log('Stringifieds '+ JSON.stringify(users.get('p4')));
            socket.emit('login', {
                numUsers: numUsers,
                p1: JSON.stringify(users.get('p1')),
                p2: JSON.stringify(users.get('p2')),
                p3: JSON.stringify(users.get('p3')),
                p4: JSON.stringify(users.get('p4')),
                username: socket.username,
                circleNum: socket.circleNum
            });
        } else if (numUsers > 4 ){ //if more than 4 users send info so spectators can see
            console.log("I'm a spectator!");
            console.log('Stringifieds '+ JSON.stringify(users.get('p1')));
            console.log('Stringifieds '+ JSON.stringify(users.get('p2')));
            console.log('Stringifieds '+ JSON.stringify(users.get('p3')));
            console.log('Stringifieds '+ JSON.stringify(users.get('p4')));
            socket.emit('display users', {
                p1: JSON.stringify(users.get('p1')),
                p2: JSON.stringify(users.get('p2')),
                p3: JSON.stringify(users.get('p3')),
                p4: JSON.stringify(users.get('p4'))
            });
        }
        if( (!userLimit) && (numUsers > 1) ){ //user joined to others, when joining mid session
            console.log("\n\n'user joined' is being emmited by by: "+ socket.username);
            console.log(socket.username+"'s info: "+ JSON.stringify(users.get(socket.circleNum)) );
            socket.broadcast.emit('user joined', {
                username: socket.username,
                numUsers: numUsers,
                circleNum: socket.circleNum,
                player: JSON.stringify(users.get(socket.circleNum))
            });
        };
    });

    socket.on

    socket.on('getHit', function(data){
        if(users.get(data.enemyCircleNum).user == data.enemyHit){
            users.set(data.enemyCircleNum, {user: data.enemyHit, x: data.enemyX,
                y: data.enemyY, angle: data.enemyAngle, health: users.get(data.enemyCircleNum).health -1,
                message: users.get(data.enemyCircleNum).message })
        }
    });

    socket.on('typing', function () {
      socket.broadcast.emit('typing', { username: socket.username, circleNum: socket.circleNum } );
    });

    socket.on('stop typing', function () {
      socket.broadcast.emit('stop typing', { username: socket.username, circleNum: socket.circleNum } );
    });

    socket.on('display user', function(data){
        if(socket.circleNum == data.circleNum){ //maybe add username check
            var check = data.circleNum;
            var currMessage = users.get(socket.circleNum).message;
            users.set(data.circleNum, {user: socket.username, x: data.x, y: data.y,
                angle: data.angle, health: data.health, message: data.message} );
                //if(users.get(socket.circleNum).messsage !== currMessage){
                //    console.log('156 '+JSON.stringify(users.get(socket.circleNum)));
                //}
        }
        socket.broadcast.emit('enemyPos', {
            p1: JSON.stringify(users.get('p1')),
            p2: JSON.stringify(users.get('p2')),
            p3: JSON.stringify(users.get('p3')),
            p4: JSON.stringify(users.get('p4'))
        });
    });


    socket.on('iDied', function(data){
        console.log('\n'+data.username+ ' has died. He was player '+data.circleNum);
        console.log('His last coordinates were x: '+data.lastX+' y: '+data.lastY);
        //users.set( data.circleNum, {user: '', x: '', y: '', angle: '', health: decidedHealth} );
        //var userDeletionIndex = userList.indexOf(socket.username);
        //if(userDeletionIndex != -1){ userList.splice(userDeletionIndex, 1, '')};
        socket.emit('playerPassed', {username: socket.username, circleNum: data.circleNum,
                                    lastX: data.lastX, lastY: data.lastY });
        socket.broadcast.emit('playerPassed', {username: socket.username, circleNum: data.circleNum,
                                                lastX: data.lastX, lastY: data.lastY})
    });

    socket.on('disconnect', function(){
        if(addedUser){
            --numUsers;

            if(numUsers < 4){userLimit = false};
            console.log('userLimit? '+userLimit)
            if(!userLimit){
                for(var r = 1; r <= 4; r++){
                    if(socket.circleNum == ('p'+r)){
                        availableCircles.splice((r-1),1, socket.circleNum)
                    }
                }

                console.log('\n'+socket.username+' has disconnected at '+ socket.circleNum);
                var userDeletionIndex = userList.indexOf(socket.username);
                console.log('userDeletionIndex of '+ socket.username+'? : '+ userDeletionIndex)
                if(userDeletionIndex != -1){ userList.splice(userDeletionIndex, 1, '')};
                users.set( socket.circleNum, {user: '', x: '', y: '', angle: 0,
                            health: decidedHealth, message: ''} )
                console.log(socket.circleNum+"'s new info: "+JSON.stringify(users.get(socket.circleNum)));

                socket.broadcast.emit('user left', {
                    numUsers: numUsers,
                    username: socket.username,
                    circleNum: socket.circleNum
                });

                console.log('Your current users are: ');
                console.log(userList);
                console.log('Your available circles are: ');
                console.log(availableCircles)
            }

        }
    });
});
