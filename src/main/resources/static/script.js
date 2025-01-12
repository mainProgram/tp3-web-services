let stompClient = null;
let unreadMessages = [];
let notificationsPanelVisible = false;

function connect() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, function(frame) {
        console.log('Connecté: ' + frame);
        stompClient.subscribe('/topic/messages', function(messageOutput) {
            showMessage(JSON.parse(messageOutput.body));
        });
    });
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    const chatContainer = document.getElementById('messageArea');
    const containerRect = chatContainer.getBoundingClientRect();

    return (
        rect.bottom <= containerRect.bottom && // Vérifie si le message est visible dans la zone de chat
        rect.bottom > containerRect.top // Vérifie si le message n'est pas au-dessus de la zone visible
    );
}

function showMessage(message) {
    const messageArea = document.getElementById('messageArea');
    const messageElement = document.createElement('div');
    const isOwnMessage = message.sender === localStorage.getItem('username');

    messageElement.className = `message ${isOwnMessage ? 'sent' : 'received'}`;
    messageElement.innerHTML = `
            <strong>${message.sender}</strong><br>
            ${message.content}<br>
            <small>${formatTime(message.timestamp)}</small>
        `;
    messageArea.appendChild(messageElement);
    if(isOwnMessage)
        messageArea.scrollTop = messageArea.scrollHeight
    // if message est visible
    const isVisible = isElementInViewport(messageElement);

    // Si ce n'est pas notre message et qu'il n'est pas visible
    if (!isOwnMessage && !isVisible) {
        unreadMessages.push(message);
        updateNotifications();
    }
}

// Fonction pour vérifier les messages lus lors du scroll
function checkVisibleMessages() {
    const messages = document.querySelectorAll('.message');
    let allMessagesVisible = true;
    let scrollableDiv = document.getElementById('messageArea');

    messages.forEach(message => {
        if (!isElementInViewport(message)) {
            allMessagesVisible = false;
        }
    });

    // Si tous les messages sont visibles, on cache le compteur
    if (allMessagesVisible) {
        document.querySelector('.notification-count').style.display = 'none';
        unreadMessages = [];
    }

    //if bottom than dont show notif count
    if (scrollableDiv.scrollTop + scrollableDiv.clientHeight >= scrollableDiv.scrollHeight) {
        //alert(7777777777777)
        unreadMessages = [];
        updateNotifications();
    }
}

// scroll
document.getElementById('messageArea').addEventListener('scroll', checkVisibleMessages);

function updateNotifications() {
    const count = document.querySelector('.notification-count');
    const panel = document.querySelector('.notifications-panel');

    if (unreadMessages.length > 0) {
    count.style.display = 'block';
    count.textContent = unreadMessages.length;

    panel.innerHTML = `
                        <div class="notifications-header">
                            Messages non lus (${unreadMessages.length})
                        </div>
                        ${unreadMessages.map(msg => `
                            <div class="notification-item unread" onclick="document.getElementById('messageArea').scrollTop = document.getElementById('messageArea').scrollHeight;">
                                <div class="notification-sender">${msg.sender}</div>
                                <div class="notification-content">${msg.content}</div>
                                <div class="notification-time">${formatTime(msg.timestamp)}</div>
                            </div>
                        `).join('')}
                    `;
    } else {
        count.style.display = 'none';
        panel.innerHTML = `
                    <div class="notifications-header">Notifications</div>
                    <div class="no-notifications">Aucun message non lu</div>
                `;
    }
}

function sendMessage() {
    const messageInput = document.getElementById('message');
    if (messageInput.value.trim() === '') return;

    const message = {
        content: messageInput.value,
        sender: localStorage.getItem('username'),
        timestamp: new Date(),
        read: false
    };

    stompClient.send("/app/chat", {}, JSON.stringify(message));
    messageInput.value = '';
    messageInput.focus();
}

document.querySelector('.notification-bell').onclick = function(e) {
    e.stopPropagation();
    const panel = document.querySelector('.notifications-panel');

    notificationsPanelVisible = !notificationsPanelVisible;
    panel.classList.toggle('show', notificationsPanelVisible);
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('.notification-bell')) {
        const panel = document.querySelector('.notifications-panel');
        panel.classList.remove('show');
        notificationsPanelVisible = false;
        unreadMessages = [];
        updateNotifications();

        const messageArea = document.getElementById('messageArea');
        messageArea.scrollTop = messageArea.scrollHeight;
    }
});

document.getElementById('message').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

window.onload = function() {
    if (!localStorage.getItem('username')) {
        let username = prompt("Entrez votre nom d'utilisateur:");
        while (!username || username.trim() === '') {
            username = prompt("Le nom d'utilisateur est obligatoire. Veuillez entrer un nom:");
        }
        localStorage.setItem('username', username.trim());
    }
    connect();
}