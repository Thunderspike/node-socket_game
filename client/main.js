var username;
var pMessage;
var d = 50;
var screenWidth = 1000;
var screenHeight = 300;
var yourInfo; //stores parsed JSON obj from server
var yourName; //stores the socket.username from server for validation
var yourCircle;
var playerIndex; //stores the sliced circleNum of any player
var personalIndex; // to keep track of self's circle for displaying self circle

var specUser = false;

var numUsers;
var healthDecided;

var defeatMessage; var LL = false; var displayDefeat; //for popping the defeat message screen
var lastX; var lastY;

var leftMessage; var lmP = false;  // display disconnect message

var FADE_TIME = 150; // ms
var TYPING_TIMER_LENGTH = 400; // ms
var connected = false;
var typing = false;

var users = new Map();
users.set('p1', {user: '', x: '', y: '', angle: undefined, health: undefined, message: ''});
users.set('p2', {user: '', x: '', y: '', angle: undefined, health: undefined, message: ''});
users.set('p3', {user: '', x: '', y: '', angle: undefined, health: undefined, message: ''});
users.set('p4', {user: '', x: '', y: '', angle: undefined, health: undefined, message: ''});

var tp1 = false; var tp2 = false; var tp3 = false; var tp4 = false;

var youO = false;
var enemyO = false;

var playerNames = ['', '', '', ''];

var socket = io();

$(function() {

    var $window = $(window);
    var $pI = $('.playerHealthInput');$pI.focus();
    var $usernameInput = $('.usernameInput'); $usernameInput.focus();
    var $loginPage = $('.login.page'); var $inputPage = $('.input.page');
    var $messages = $('.messages'); var $gamePage = $('.game.page');
    var $inputMessage = $('.inputMessage');

    socket.on('check username', function(data){
        playerNames = JSON.parse(data.userList);
        console.log(playerNames);
        numUsers = data.numUsers;
        console.log('number of users before you: ' + numUsers);
        if(numUsers == 0){ $inputPage.show(); $pI.focus() }
        if(numUsers > 0){ $loginPage.show(); $usernameInput.focus() }
    });

    function setUsername () {
        username = $usernameInput.val().trim();
        if (username) {
            $loginPage.fadeOut();
            $('.room').show(100);
            $loginPage.off('click');
            $loginPage.remove();
            $gamePage.show()
            socket.emit('add user', username);
        }
    }

    function sendMessage(){
        var pMessage = $inputMessage.val().toString();
        if (pMessage && connected){
            console.log(JSON.stringify(users.get(yourCircle)));
            users.get(yourCircle).message = pMessage;
            setTimeout(function(){ users.get(yourCircle).message = ''; }, 6500);
            $inputMessage.val('');
            console.log('yourCircle: '+yourCircle);
            console.log('Parsifieds '+ JSON.stringify(users.get(yourCircle)) );

        }
    }

    function updateTyping () {
      if (connected) {
        if (!typing) {
          typing = true;
          socket.emit('typing');
        }
        lastTypingTime = (new Date()).getTime();
        setTimeout(function () {
          var typingTimer = (new Date()).getTime();
          var timeDiff = typingTimer - lastTypingTime;
          if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
            socket.emit('stop typing');
            typing = false;
          }
        }, TYPING_TIMER_LENGTH);
      }
    }

    $window.keydown(function (event) {
        if(event.which === 13){
            if(username && $inputMessage !== ''){
                sendMessage();
                socket.emit('stop typing');
                typing = false;
            }
            if(numUsers == 0){
                if($pI.val() == '' || $pI.val() < 1 || $pI.val() > 100){
                    $(document).ready( function(){ $pI.effect("shake"); });
                } else {
                    healthDecided = parseInt($pI.val(), 10);
                    $inputPage.hide();
                    console.log('\nhealth decided: ' + healthDecided);
                    socket.emit('setting health', {
                        health: healthDecided
                    })
                    $loginPage.show(100);
                    $usernameInput.focus();
                }
            }
            if ( playerNames.indexOf($usernameInput.val().trim()) > (-1) ) {
                $(document).ready( function(){ $('.usernameInput').effect("shake"); });
            } else if(! playerNames.indexOf($usernameInput.val().trim()) > (-1) ) {
                setUsername();
            }
        }
    });

    $inputMessage.on('input', function() { updateTyping(); } );

    function deleteUser(userLeft, circleLeft){
        console.log('player that is being deleted ' + userLeft+ ' > and his circle > '+circleLeft);
        if( (userLeft) &&  (users.get(circleLeft).user == '') ){
            var positionInList = (parseInt((circleLeft).slice(1), 10) - 1);
            console.log('position of player that left: '+ positionInList);
            if (playerNames[positionInList]){ playerNames.splice(positionInList, 1, ''); }
            var countPlayers = 0;
            for (var ch = 0; ch < 4; ch++){
                if (playerNames[ch] !== ''){ countPlayers++; }
            }
            console.log('number of players left: '+ countPlayers)
            if( (countPlayers == 1) && (playerNames[personalIndex] !== '') ) {
                enemyO = false; console.log('only you no enemy;');
                console.log('personalIndex: ' + personalIndex);
            }
            else if (countPlayers >= 1 && (playerNames[personalIndex] == '') ) youO = false;
            else if (countPlayers == 0){ youO = false; enemyO = false; };
            console.log('playerNames after deletion: ');console.log(playerNames)
        }
    }

    function displayUsers(){
        for(var y = 1; y <= 4; y++){
            var circleOf = 'p'+y;
            var use = users.get('p'+y);
            var index = y - 1;
            if(!specUser){
                if(users.get(circleOf).user === username){
                    playerNames[index].x = use.x; playerNames[index].y = use.y;
                    playerNames[index].angle = use.angle; playerNames[index].health = use.health;
                    //playerNames[index].message = use.message;
                    //console.log(JSON.stringify(use));
                    youO = true;
                } else if( (users.get(circleOf).user !== username) && (playerNames[index] !== '') ){
                    playerNames[index].x = use.x; playerNames[index].y = use.y;
                    playerNames[index].angle = use.angle; playerNames[index].health = use.health;
                    enemyO = true;
                }
            } else if(specUser){
                if (users.get(circleOf).health > 0){
                    playerNames[index].x = use.x; playerNames[index].y = use.y;
                    playerNames[index].angle = use.angle; playerNames[index].health = use.health;
                }
            }
        }
    }

    socket.on('login', function(data) {
        playerIndex = parseInt((data.circleNum).slice(1), 10) - 1;
        personalIndex = playerIndex; //store personal index to keep track of self user
        console.log("\nPending case is on playerNames["+personalIndex+"], < your assigned playerIndex");
        if(data.numUsers == 1){
            yourInfo = JSON.parse(data.userInfo); //stored JSON obj of p1
            users.set(data.circleNum, yourInfo); //pass client Users own info
            console.log("\nYou're the only user. Parsified Info: "+ JSON.stringify(users.get(data.circleNum)) );
            playerNames.splice((personalIndex), 1, yourInfo.user.toString()); //<<<<<<<<<<<< could be made from socket.username or username
            console.log(playerNames);
        } else if (data.numUsers > 1) {
            console.log("\nThere's more than one user. Welcome!")
            users.set('p1', JSON.parse(data.p1));
            users.set('p2', JSON.parse(data.p2));
            users.set('p3', JSON.parse(data.p3));
            users.set('p4', JSON.parse(data.p4));
            yourInfo = users.get(data.circleNum);
            for (var t = 1; t<=4; t++){
                if(users.get('p'+t).user !== ''){
                    playerNames.splice((t-1), 1, users.get('p'+t).user);
                }
            }
            console.log('Parsifieds '+ JSON.stringify(users.get('p1')) );
            console.log('Parsifieds '+ JSON.stringify(users.get('p2')) );
            console.log('Parsifieds '+ JSON.stringify(users.get('p3')) );
            console.log('Parsifieds '+ JSON.stringify(users.get('p4')) );
            console.log(playerNames);
        }
        numUsers = data.numUsers; console.log('total current users: '+numUsers);
        //extract user's name from users obj, should be changed to extract from data.username
        //or since I'm literraly storing username don't even need to extract from the data
        yourName = users.get(data.circleNum).user;
        yourCircle = data.circleNum; //unnecessary to store just checking
        connected = true;

        console.log('HEY! You are player: ' + yourCircle + '. Your info: '+ username);

        console.log('Playername: ' + yourInfo.user);
        console.log("Your name >>>>>>> " + yourName);
        if ((data.numUsers == 1) && (yourName == username)){
            // creating the player obj here is correct, for its the first time created
            playerNames[personalIndex] = new playerObj('white', 50, 3, username, data.circleNum,
                                                    yourInfo.x, yourInfo.y, yourInfo.health);
            youO = true; //unhatch the gates  of drawing self
        } else if (data.numUsers > 1){
            console.log('Prexisting users: \n');
            for(var n = 1; n <= 4; n++){
                var userN = 'p'+n;
                if ( (users.get(userN).user !== '') && (users.get(userN).user !== username) ){
                    //create an enemyObj for every player that's not you
                    playerNames[n-1] = new enemyObj('white', 50, 3, users.get(userN).user,
                                        userN, users.get(userN).x, users.get(userN).y,
                                        users.get(userN).angle, users.get(userN).health);
                console.log(JSON.stringify(users.get(userN)));
                }
            }
            enemyO = true; //allow enemyObj to exist
            //create yourself and allow it to exist
            //playerObj(color, sz, speed, circleNum, posX, posY, health, gate){
            playerNames[personalIndex] = new playerObj('white', 50, 3, username, data.circleNum,
                                        yourInfo.x, yourInfo.y, yourInfo.health);
            youO = true;
        }
    });

    socket.on('user joined', function(data){
        numUsers = data.numUsers;
        var userJ = data.circleNum;
        users.set(userJ, JSON.parse(data.player) );
        console.log(data.circleNum+' Is looking to join you')
        console.log( data.username+"'s info: "+ JSON.stringify(users.get(userJ)) )
        playerIndex = parseInt((userJ).slice(1), 10) - 1;
        console.log(data.username+"'s slot is "+playerIndex)
        playerNames.splice(playerIndex, 1, data.username);
        //console.log(playerNames);
        playerNames[playerIndex] = new enemyObj('white', 50, 3, users.get(userJ).user,
                                     userJ, users.get(userJ).x, users.get(userJ).y,
                                     users.get(userJ).angle, users.get(userJ).health);

        enemyO = true;
        displayUsers();
    });

    socket.on('enemyPos', function(data){
        if(username){
            users.set('p1', JSON.parse(data.p1));
            users.set('p2', JSON.parse(data.p2));
            users.set('p3', JSON.parse(data.p3));
            users.set('p4', JSON.parse(data.p4));
            displayUsers()
        }
    });

    function addChatTyping(data){
        console.log('name of player tying to type: '+data.username);
        console.log('playerTyping = '+ data.circleNum);
        if (data.circleNum == 'p1') tp1 = true;
        if (data.circleNum == 'p2') tp2 = true;
        if (data.circleNum == 'p3') tp3 = true;
        if (data.circleNum == 'p4') tp4 = true;
    }
    function removeChatTyping(data){
        console.log('name of player no longer typing: '+data.username);
        console.log('player no longer typing = '+ data.circleNum);
        if (data.circleNum == 'p1') tp1 = false;
        if (data.circleNum == 'p2') tp2 = false;
        if (data.circleNum == 'p3') tp3 = false;
        if (data.circleNum == 'p4') tp4 = false;
    }

    socket.on('playerPassed', function(data){
        console.log(data.username+' has died! He was player '+data.circleNum);
        console.log(playerNames);
        if (data.username == username){
            console.log('Its you that died! '+data.lastX+ ' '+data.lastY);
            lastX = data.lastX; lastY = data.lastY;
            var message = 'You died. Press the button below to play again'
            displayDefeat = new displayDefeatMessage(lastX, lastY, message);
        } else {
            lastX = data.lastX; lastY = data.lastY;
            var message = data.username+' has died!'
            displayDefeat = new displayDefeatMessage(lastX, lastY, message);
        }
        LL = true;
        setTimeout(function(){ LL = false; }, 6500);
    });

    socket.on('display users', function(data){
        users.set('p1', JSON.parse(data.p1));
        users.set('p2', JSON.parse(data.p2));
        users.set('p3', JSON.parse(data.p3));
        users.set('p4', JSON.parse(data.p4));
        for (var r = 0; r<4; r++){
            circ = 'p'+(r+1);
            playerNames[r] = users.get(circ).user
            if(users.get(circ).health > 0){
                playerNames[r] = new enemyObj('white', 50, 3, users.get(circ).user,
                                             circ, users.get(circ).x, users.get(circ).y,
                                             users.get(circ).angle, users.get(circ).health);
            }
        }
        console.log(playerNames);
        //displayUsers(true);
        specUser = true;
        $messages.append( $('<div class="spectator">').text("Welcome "+username+
        ".\nThe game is currently full. You're in spectator mode") );
    });

    socket.on('user left', function(data){
        numUsers = data.numUsers;
        lmP = true; leftMessage = new displayDisconnectMessage(data.username);
        setTimeout( function(){ lmP=false; }, 6500 );
        console.log(data.username+' num '+data.circleNum+' has left');
        users.set( data.circleNum, {user: '', x: '', y: '', angle: '', health: '', message: ''} );
        console.log(data.circleNum+"'s position is now "+JSON.stringify( users.get(data.circleNum) ) );
        deleteUser( data.username, data.circleNum );
        displayUsers();
    });

    socket.on('typing', function(data) { addChatTyping(data); } );
    socket.on('stop typing', function(data){ removeChatTyping(data); } );

});

var count, negCount;
var keycode = "";
var dash = 50;
//var hpInDegs = 180/hp;
//var altControls = [38, 39, 40, 37, false, false];
//up, right, down, left, leftclick, rightclick

function getKey(e){
	keycode = e.keyCode;
}
document.onkeyup = getKey;

function setup(){
    var canvas =  createCanvas(screenWidth, screenHeight);
    canvas.parent('game');
    console.log('setup!');
};

function draw(){
    background('black');

    if(!specUser){ //if not a spectator
        if(youO){
            if(playerNames[personalIndex].health > 0){
                playerNames[personalIndex].disp()
            };
        }; //display self
        if(enemyO){ //display enemies
            for (var z = 0; z < 4; z++ ){
                var plr = ('p'+(z+1));
                if ( (users.get(plr).user !== '') && (users.get(plr).user != username) ){
                    if (playerNames[z].health > 0){
                        playerNames[z].disp();
                    }
                }
            }
        }

        var usersAlive = 0;
        for (var e = 0; e < 4; e++){
            if (playerNames[e].health > 0) usersAlive++;
        }

        if(enemyO){
            if(playerNames[personalIndex].health > 0){
                if(usersAlive == 2){
                    for(var a = 0; a<4; a++){
                        for(var b = 0; b<4; b++){
                            if(b == a){continue;}
                            else if(enemyO && playerNames[a] !== '' && playerNames[b] !== '' &&
                                    playerNames[a].health > 0 && playerNames[b].health > 0){
                                playerNames[a].collide1(playerNames[b]);
                            }
                        }
                    }
                } else if (usersAlive == 3){
                    if(playerNames[0] == '' || playerNames[0].health <= 0){ //['',Thunder,Lou, Pete]
                        playerNames[1].collide1(playerNames[2]); playerNames[1].collide2(playerNames[3]);
                        playerNames[2].collide1(playerNames[1]); playerNames[2].collide2(playerNames[3]);
                        playerNames[3].collide1(playerNames[1]); playerNames[3].collide2(playerNames[2]);
                    } else if(playerNames[1] == '' || playerNames[1].health <= 0){ //[Thunder,'',Lou, Pete]
                        playerNames[0].collide1(playerNames[2]); playerNames[0].collide2(playerNames[3]);
                        playerNames[2].collide1(playerNames[0]); playerNames[2].collide2(playerNames[3]);
                        playerNames[3].collide1(playerNames[0]); playerNames[3].collide2(playerNames[2]);
                    } else if(playerNames[2] == '' || playerNames[2].health <= 0){ //[Thunder,Lou,'', Pete]
                        playerNames[0].collide1(playerNames[1]); playerNames[0].collide2(playerNames[3]);
                        playerNames[1].collide1(playerNames[0]); playerNames[1].collide2(playerNames[3]);
                        playerNames[3].collide1(playerNames[0]); playerNames[3].collide2(playerNames[1]);
                    } else if(playerNames[3] == '' || playerNames[3].health <= 0) { //[Thunder,Lou, Pete, '']
                        playerNames[0].collide1(playerNames[1]); playerNames[0].collide2(playerNames[2]);
                        playerNames[1].collide1(playerNames[0]); playerNames[1].collide2(playerNames[2]);
                        playerNames[2].collide1(playerNames[0]); playerNames[2].collide2(playerNames[1]);
                    }
                } else if (usersAlive == 4){
                    playerNames[0].collide1(playerNames[1]); playerNames[0].collide2(playerNames[2]); playerNames[0].collide3(playerNames[3]);
                    playerNames[1].collide1(playerNames[0]); playerNames[1].collide2(playerNames[2]); playerNames[1].collide3(playerNames[3]);
                    playerNames[2].collide1(playerNames[1]); playerNames[2].collide2(playerNames[1]); playerNames[2].collide3(playerNames[3]);
                    playerNames[3].collide1(playerNames[0]); playerNames[3].collide2(playerNames[1]); playerNames[3].collide3(playerNames[2]);
                }
            }
        }
    } else if (specUser){ //specUser
        for (var e = 0; e < 4; e++){
            var cir = 'p'+(e+1);
            if(users.get(cir).health > 0){
                playerNames[e].disp();
            }
        }
    }

    if(lmP){
        leftMessage.disp();
    }
    if(LL){
        displayDefeat.disp();
    }
}

function displayDisconnectMessage(user){
    this.user = user
    this.disp = function(){
        fill('white');
        text(this.user + ' has disconnected', screenWidth/2 + -50, 50);
    }
}

function displayDefeatMessage(x, y, message){
    console.log(message);
    console.log(x, y);
    this.x = x; this.y = y; this.message = message;
    this.disp = function(){
        fill('white');
        text(message, this.x - (message.length / 2), this.y);
    }
}

function playerObj(color, sz, speed, name, circleNum, posX, posY, health){
    var controls = [87,68,83,65,69,81]; //w, d, s, a, e, q
    this.name = name; this.circleNum = circleNum; this.x = posX; this.y = posY;
    this.count = 0; //counting how long e is held down for
	this.negCount = 0; //counting how long q is held down for
    this.linex; this.liney; this.saveColor = 'red'; this.speed = speed;
	this.swordSpeed = 0.05; this.color = color; this.d = sz; this.angle = 0;
    this.scalar = sz + 50;  this.health = health;
    this.gate1 = false; this.gate2 = false; this.gate3 = false;
    this.overlap1 = false; this.overlap2 = false; this.overlap3 = false;
    this.hit1 = false; this.hit2 = false; this.hit3 = false;
    this.disp = function(){
        //console.log('from inside the obj, this.message: '+users.get(this.circleNum).message );
        if(this.x < 0){ this.x = width; }; if(this.x > width) { this.x = 0;} //loop around the edges
		if(this.y < 0) { this.y = height; }; if (this.y > height){ this.y = 0; }
/*move*/if( keyIsDown( controls[0] )){ if (keycode == 32){ this.y -= dash; keycode = ""; }; this.y -= this.speed; } //up
/*ment*/if( keyIsDown( controls[1] )){ if (keycode == 32){ this.x += dash; keycode = ""; }; this.x += this.speed; }// left
        if( keyIsDown( controls[2] )){ if (keycode == 32){ this.y += dash; keycode = ""; }; this.y += this.speed; }//down
        if( keyIsDown( controls[3] )){ if (keycode == 32){ this.x -= dash; keycode = ""; }; this.x -= this.speed; }//right
        if( keyIsDown( controls[4] )){ //clockWise
            this.count++;
            if (this.count < 150) this.angle += this.swordSpeed;
            else if (this.count >= 150 && this.count < 300) this.angle += 0.1;
            else if (this.count >= 300 && this.count < 450 ) this.angle += 0.2;
            else if (this.count >= 450 && this.count < 550) this.angle += .4;
            else if (this.count > 550){ this.count += 0.025; this.angle *= 0.95; }
        }
        else if ( ! ( keyIsDown( controls[4] ) ) ) { this.count = 0; }
        if( keyIsDown( controls[5] )){ //counterClockWise
            this.negCount++;
            if (this.negCount < 150) this.angle -= this.swordSpeed;
            else if (this.negCount >= 150 && this.negCount < 300) this.angle -= 0.1;
            else if (this.negCount >= 300 && this.negCount < 450 ) this.angle -= 0.2;
            else if (this.negCount >= 450 && this.negCount < 550) this.angle -= .4;
            else if (this.negCount >= 550){ this.negCount -= 0.025; this.angle *= 0.95; }
        }
        else if ( ! ( keyIsDown( controls[5] ) ) ) { this.negCount = 0; }
        this.linex = this.x + cos(this.angle) * this.scalar; //calc sword
		this.liney = this.y + sin(this.angle) * this.scalar;
        strokeWeight(4); //gives thickness to 1d line
		stroke(this.saveColor); //colors sword
		line(this.linex, this.liney, (this.linex + this.x)/2 , (this.liney + this.y)/2)
		noStroke(); //draw the player
        fill(this.color);
		ellipse(this.x, this.y, this.d, this.d);
        this.displayDistance = 6; if(this.health < 10){ this.displayDistance = 1.2} //for cool pts.
        text(this.health, this.x - this.displayDistance, this.y-30);
        fill(this.saveColor);
        text(username, (this.x - username.length * 2.5), this.y);
        if(typing){ fill('white'); text('typing...', (this.x - username.length * 2.5), this.y - 50); }
        if ( users.get(this.circleNum).message !== ''){
            fill('white'); text(users.get(this.circleNum).message, (this.x - username.length * 2.5), this.y - 75);
        };

        if( keyIsDown(controls[0]) || keyIsDown(controls[1]) || keyIsDown(controls[2])
         || keyIsDown(controls[3]) || keyIsDown(controls[4]) || keyIsDown(controls[5]) ){
            users.set(yourCircle, {username: username, x: this.x, y: this.y,
                angle: this.angle, health: this.health, message: users.get(this.circleNum).message});
            //console.log(JSON.stringify(users.get(yourCircle) ) );
            socket.emit('display user', { username: username, x: this.x, y: this.y,
                angle: this.angle, circleNum: this.circleNum, health: this.health,
                message: users.get(this.circleNum).message });
        }

        if(this.health <= 0){ socket.emit('iDied', {username: username, circleNum: yourCircle, lastX: this.x, lastY: this.y}) };
    }
    this.collide1 = function(enemy){
        this.overlap1 = collideCircleCircle(this.x,this.y,this.d,enemy.x,enemy.y,enemy.d) // are we overlapping with the enemy?
        this.hit1 = collideLineCircle(this.x, this.y, this.linex, this.liney, enemy.x, enemy.y, enemy.d); //sword hitting the other player?
        if(this.hit1 == false){
            this.gate1 = false;
        }
        if(this.overlap1 == false){ // prevent from scoreing if overlapped
            if(this.gate1 == false){ //debounce madness so only one point/hit gets added
                if(this.hit1 == true){
                    this.gate1 = true;
                    enemy.health--;
                    enemy.color = 'red'
                    setTimeout( function(){ enemy.color = 'white'; }, 100 );
                    socket.emit('getHit', {
                        enemyHit: enemy.name, enemyCircleNum: enemy.circleNum, enemyX: enemy.x,
                        enemyY: enemy.y, enemyAngle: enemy.angle, enemyHealth: enemy.health
                    });
                }
            }
        }
    }
    this.collide2 = function(enemy){
        this.overlap2 = collideCircleCircle(this.x,this.y,this.d,enemy.x,enemy.y,enemy.d) // are we overlapping with the enemy?
        this.hit2 = collideLineCircle(this.x, this.y, this.linex, this.liney, enemy.x, enemy.y, enemy.d); //sword hitting the other player?
        if(this.hit2 == false){
            this.gate2 = false;
        }
        if(this.overlap2 == false){ // prevent from scoreing if overlapped
            if(this.gate2 == false){ //debounce madness so only one point/hit gets added
                if(this.hit2 == true){
                    this.gate2 = true;
                    enemy.health--;
                    enemy.color = 'red'
                    setTimeout( function(){ enemy.color = 'white'; }, 100 );
                    socket.emit('getHit', {
                       enemyHit: enemy.name, enemyCircleNum: enemy.circleNum, enemyX: enemy.x,
                       enemyY: enemy.y, enemyAngle: enemy.angle, enemyHealth: enemy.health
                    });
                }
            }
        }
    }
    this.collide3 = function(enemy){
        this.overlap3 = collideCircleCircle(this.x,this.y,this.d,enemy.x,enemy.y,enemy.d) // are we overlapping with the enemy?
        this.hit3 = collideLineCircle(this.x, this.y, this.linex, this.liney, enemy.x, enemy.y, enemy.d); //sword hitting the other player?
        if(this.hit3 == false){
            this.gate3 = false;
        }
        if(this.overlap3 == false){ // prevent from scoreing if overlapped
            if(this.gate3 == false){ //debounce madness so only one point/hit gets added
                if(this.hit3 == true){
                    this.gate3 = true;
                    enemy.health--;
                    enemy.color = 'red'
                    setTimeout( function(){ enemy.color = 'white'; }, 100 );
                    socket.emit('getHit', {
                        enemyHit: enemy.name, enemyCircleNum: enemy.circleNum, enemyX: enemy.x,
                        enemyY: enemy.y, enemyAngle: enemy.angle, enemyHealth: enemy.health
                    });
                }
            }
        }
    }
}

function enemyObj(color, sz, speed, name, circleNum, posX, posY, angle = 0, health){
    this.name = name; this.x = posX; this.y = posY; this.circleNum = circleNum;
    var nameLength = this.name;
    this.count = 0; //counting how long e is held down for
	this.negCount = 0; //counting how long q is held down for
    this.linex; this.liney; this.saveColor = 'red'; this.speed = speed;
	this.swordSpeed = 0.05; this.color = color; this.d = sz; this.angle = angle;
    this.scalar = sz + 50; this.health = health; this.damageTaken;
    this.gate1 = false; this.gate2 = false; this.gate3 = false;
    this.overlap1 = false; this.overlap2 = false; this.overlap3 = false;
    this.hit1 = false; this.hit2 = false; this.hit3 = false;
    this.disp = function(){
        this.linex = this.x + cos(this.angle) * this.scalar; //calc sword
		this.liney = this.y + sin(this.angle) * this.scalar;
        strokeWeight(4); //gives thickness to 1d line
		stroke(this.saveColor); //colors sword
		line(this.linex, this.liney, (this.linex + this.x)/2 , (this.liney + this.y)/2);
		noStroke(); //draw the player
        fill(this.color);
		ellipse(this.x, this.y, this.d, this.d);
        this.displayDistance = 6; if(this.health < 10){ this.displayDistance = 1.2} //for cool pts.
        text(this.health, this.x-7, this.y-30);
        fill(this.saveColor);
        text(this.name, (this.x - nameLength.length * 2.5), this.y);
        if(this.circleNum == 'p1'){ //console.log(this.circleNum === 'p1');
            if(tp1){ fill('white'); text(this.name+' is typing...', (this.x - username.length * 2.5), this.y - 50); }
        }
        if(this.circleNum == 'p2'){ //console.log(this.circleNum === 'p1');
            if(tp2){ fill('white'); text(this.name+' is typing...', (this.x - username.length * 2.5), this.y - 50); }
        }
        if(this.circleNum == 'p3'){ //console.log(this.circleNum === 'p1');
            if(tp3){ fill('white'); text(this.name+' is typing...', (this.x - username.length * 2.5), this.y - 50); }
        }
        if(this.circleNum == 'p4'){ //console.log(this.circleNum === 'p1');
            if(tp4){ fill('white'); text(this.name+' is typing...', (this.x - username.length * 2.5), this.y - 50); }
        }
        if ( users.get(this.circleNum).message !== ''){
            fill('white'); text(users.get(this.circleNum).message, (this.x - username.length * 2.5), this.y - 75);
        };
    }
    this.collide1 = function(enemy){
        this.overlap1 = collideCircleCircle(this.x,this.y,this.d,enemy.x,enemy.y,enemy.d) // are we overlapping with the enemy?
        this.hit1 = collideLineCircle(this.x, this.y, this.linex, this.liney, enemy.x, enemy.y, enemy.d); //sword hitting the other player?
        if(this.hit1 == false){
            this.gate1 = false;
        }
        if(this.overlap1 == false){ // prevent from scoreing if overlapped
            if(this.gate1 == false){ //debounce madness so only one point/hit gets added
                if(this.hit1 == true){
                    enemy.health--;

                    this.gate1 = true;
                    enemy.color = 'red'
                    setTimeout( function(){ enemy.color = 'white'; }, 100 );
                }
            }
        }
    }
    this.collide2 = function(enemy){
        this.overlap2 = collideCircleCircle(this.x,this.y,this.d,enemy.x,enemy.y,enemy.d) // are we overlapping with the enemy?
        this.hit2 = collideLineCircle(this.x, this.y, this.linex, this.liney, enemy.x, enemy.y, enemy.d); //sword hitting the other player?
        if(this.hit2 == false){
            this.gate2 = false;
        }
        if(this.overlap2 == false){ // prevent from scoreing if overlapped
            if(this.gate2 == false){ //debounce madness so only one point/hit gets added
                if(this.hit2 == true){
                    enemy.health--;
                    this.gate2 = true;
                    enemy.color = 'red'
                    setTimeout( function(){ enemy.color = 'white'; }, 100 );
                }
            }
        }
    }
    this.collide3 = function(enemy){
        this.overlap3 = collideCircleCircle(this.x,this.y,this.d,enemy.x,enemy.y,enemy.d) // are we overlapping with the enemy?
        this.hit3 = collideLineCircle(this.x, this.y, this.linex, this.liney, enemy.x, enemy.y, enemy.d); //sword hitting the other player?
        if(this.hit3 == false){
            this.gate3 = false;
        }
        if(this.overlap3 == false){ // prevent from scoreing if overlapped
            if(this.gate3 == false){ //debounce madness so only one point/hit gets added
                if(this.hit3 == true){
                    this.gate3 = true;
                    enemy.color = 'red'
                    setTimeout( function(){ enemy.color = 'white'; }, 100 );
                }
            }
        }
    }
}
