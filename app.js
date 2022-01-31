const express = require('express');
const socketio = require('socket.io');
const path = require('path');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const dbConnection = require('./database');
const {body,validationResult} = require('express-validator');
const console = require('console');
const {Users} = require('./user');

const app = express();
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));
app.use(express.static('public'));
app.use(express.urlencoded({extended:false}));
let users = new Users();

var chater = "Unkhow";
var chaterId = "";
console.log(chaterId);

app.use(cookieSession({
    name:'session',
    keys:['key1','key2'],
    maxAge:3600 * 1000
}))

// Declaring Custom middleware
const ifNotLoggedIn = (req,res,next) => {
    if(!req.session.isLoggedIn){
        return res.render('login');
    }
    next();
}

const ifLoggedIn = (req,res,next) => {
    if(req.session.isLoggedIn) {
        return res.rediract('/index');
    }
    next();
}

// root page
app.get('/',ifNotLoggedIn,(req,res,next) => {
    dbConnection.execute("SELECT id,name FROM users WHERE id = ?",[req.session.userID])
    .then(([rows]) => {
        chater = rows[0].name;
        chaterId = rows[0].id;
        res.render('index',{
            name: rows[0].name,
            id: rows[0].id
        })
    })
})

// register
app.post('/register', ifLoggedIn,[
    body('user_email','Invalid email address!').isEmail().custom((value) => {
        return dbConnection.execute('SELECT `email` FROM `users` WHERE `email`= ?', [value])
        .then(([rows]) => {
            if(rows.length > 0){
                return Promise.reject('This E-mail already in use!');
            }
            return true;
        });
    }),
    body('user_name','Username is Empty!').trim().not().isEmpty(),
    body('user_pass','The password must be of minimum length 8 characters').trim().isLength({ min: 8 }),
],
(req,res,next) => {

    const validation_result = validationResult(req);
    const {user_name, user_pass, user_email} = req.body;
    if(validation_result.isEmpty()){
        bcrypt.hash(user_pass, 12).then((hash_pass) => {
            dbConnection.execute("INSERT INTO `users`(`name`,`email`,`password`) VALUES(?,?,?)",[user_name,user_email, hash_pass])
            .then(result => {
                res.render('login');
            }).catch(err => {
                if (err) throw err;
            });
        })
        .catch(err => {
            if (err) throw err;
        })
    }
    else{
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        res.render('register',{
            register_error:allErrors,
            old_data:req.body
        });
    }
});

// login
app.post('/', ifLoggedIn, [
    body('user_email').custom((value) => {
        return dbConnection.execute('SELECT email FROM users WHERE email= ?', [value])
        .then(([rows]) => {
            if(rows.length == 1){
                return true;
            }
            return Promise.reject('Invalid Email Address!');
        });
    }),
    body('user_pass','Password is empty!').trim().not().isEmpty(),
], (req, res) => {
    const validation_result = validationResult(req);
    const {user_pass, user_email} = req.body;
    if(validation_result.isEmpty()){
        dbConnection.execute("SELECT * FROM `users` WHERE `email` = ? ",[user_email])
        .then(([rows]) => {
            bcrypt.compare(user_pass, rows[0].password).then(compare_result => {
                if(compare_result === true){
                    req.session.isLoggedIn = true;
                    req.session.userID = rows[0].id;
                    res.redirect('/');
                    
                }
                else{
                    res.render('login',{
                        login_errors:['Invalid Password!']
                    });
                }
            })
            .catch(err => {
                if (err) throw err;
            });
        }).catch(err => {
            if (err) throw err;
        });
    }
    else{
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        res.render('login',{
            login_errors:allErrors
        });
    }
});

app.get('/register',(req,res) => {
    res.render('register')
});

//logout
app.get('/logout',(req,res)=>{
    req.session = null;
    res.redirect('/');
});

app.use('/', (req,res) => {
    res.status(404).send('<h1>404 Page Not Found!</h1>');
});

const server = app.listen(process.env.PORT || 3000,() => {
    console.log("server is running...");
});

// socket.io
const io = socketio(server);

io.on("connection",socket => {
    console.log("New user connected");
    socket.username = chater;
    socket.userid = chaterId;

    socket.on("join",() =>{
        idIn = socket.id;
        nameIn = chater;
        users.addUser(idIn,nameIn);
        io.sockets.emit("getuser",users.showUserList());
    });
    socket.on("new_message",data => {
        console.log("new message");
        io.sockets.emit("receive_message",{message: data.message,username: socket.username ,userid: socket.userid});
    })

    socket.on('typing',data => {
        socket.broadcast.emit('typing',{username: socket.username});
    })

    socket.on('disconnect', function() {
        let user = users.removeUser(socket.id);
        if(user){
            io.sockets.emit("getuser",users.showUserList());
        }
        console.log('Client disconnected.');
    });
    
});

