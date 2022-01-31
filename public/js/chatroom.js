
(function connect(){
    let socket = io.connect("http://localhost:3000");
    socket.emit('join');

    let message = document.querySelector('#message');
    let messageBtn = document.querySelector('#messageBtn');
    let messageList = document.querySelector('#message-list');
    let curUserid = document.getElementById('name').getAttribute('value');

    messageBtn.addEventListener('click',e => {
        console.log(message.value);
        socket.emit('new_message',{message: message.value});
        message.value = '';
    })

    var current = new Date();
    function addZero(i) {
        if (i < 10) {i = "0" + i}
        return i;
      }
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December" ];
    var time = current.getDay() + " " + monthNames[ current.getMonth()] + " " + current.getFullYear() + " " + addZero(current.getHours()) + ":" + addZero(current.getMinutes());

    function scrollToBottom() {
        scl = document.getElementById("message-list");
        scl.scrollTop = scl.scrollHeight;
    }

    socket.on('receive_message',data => {
        console.log(data);
        let listItem = document.createElement('li');
        let listHeader = document.createElement('div');
        let listBody = document.createElement('div');
        listHeader.textContent = data.username + " : " + time;
        listBody.textContent = data.message;
        listHeader.classList.add('list-item-header');
        listBody.classList.add('list-item-body');
        listItem.innerHTML += listHeader.outerHTML + listBody.outerHTML;

        if(data.userid == curUserid){
            listItem.classList.add('list-group-item');
            listItem.classList.add('right');
        }else{
            listItem.classList.add('list-group-item');
            listItem.classList.add('left');
        }
        messageList.appendChild(listItem);
        scrollToBottom();
    })

    let info = document.querySelector('.info');

    message.addEventListener('keypress',e => {
        socket.emit('typing');
    })

    socket.on('typing',data => {
        info.textContent = data.username + " กำลังพิมพ์...";
        setTimeout(() => {
           info.textContent = ''; 
        }, 5000);
    })

    let user = document.querySelector('#user');
    socket.on('getuser',data => {
        user.textContent = "";
        data.map((i) => {
            let list = document.createElement('li');
            list.textContent = "🟢 " + i.name + " เข้าใช้งาน " + time;
            list.classList.add('list-user');
            user.appendChild(list);
        });
    })

})();