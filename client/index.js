let socket = io('http://localhost:5050', { path: '/real-time' });

// Elementos del DOM
const joinButton = document.getElementById('join-button');
const startButton = document.getElementById('start-button');
const gameControls = document.getElementById('game-controls');
const nicknameDisplay = document.getElementById('nickname-display');
const roleDisplay = document.getElementById('role-display');
const actionButton = document.getElementById('action-button');
const marcoNotification = document.createElement('div');
const poloList = document.createElement('div');
const poloSelection = document.createElement('div');

gameControls.appendChild(marcoNotification);
gameControls.appendChild(poloList);
gameControls.appendChild(poloSelection);

joinButton.addEventListener('click', () => {
	const nickname = document.getElementById('nickname').value;

	if (nickname) {
		localStorage.setItem('nickname', nickname);
		socket.emit('joinGame', { nickname });

		nicknameDisplay.textContent = nickname;
		gameControls.style.display = 'flex';
		document.getElementById('nickname').style.display = 'none';
		joinButton.style.display = 'none';
	} else {
		alert('Por favor, ingresa un nombre');
	}
});

startButton.disabled = true;

// Escuchar cuando el número de jugadores cambia
socket.on('playerCountUpdated', (playerCount) => {
	if (playerCount >= 3) {
		startButton.disabled = false; // Habilitar botón si hay 3 o más jugadores
	} else {
		startButton.disabled = true;
	}
});

// Botón para iniciar el juego
startButton.addEventListener('click', () => {
	socket.emit('startGame');
});

// Escuchar cuando se asigna un rol a cada jugador
socket.on('roleAssigned', (data) => {
	const { role } = data;
	roleDisplay.textContent = `Tú eres "${role}"`;

	// Ocultar el botón de "Iniciar Juego" una vez que el juego ha comenzado
	startButton.style.display = 'none';

	// Ajustar el botón según el rol
	if (role === 'Marco') {
		actionButton.textContent = 'Gritar MARCO';
		actionButton.onclick = () => socket.emit('notifyMarco');

		showPoloSelection();
	} else {
		actionButton.textContent = 'Gritar POLO';
		actionButton.onclick = () => socket.emit('notifyPolo');
	}

	// Mostrar el botón de acción
	actionButton.style.display = 'block';
});

function showPoloSelection() {
	poloSelection.textContent = 'Selecciona un Polo:';
	// Crear un botón por cada Polo para que Marco pueda seleccionarlo
	socket.on('polosList', (polos) => {
		poloSelection.innerHTML = '';
		polos.forEach((polo, index) => {
			const poloButton = document.createElement('button');
			poloButton.textContent = `Polo ${index + 1} (${polo.nickname})`;
			poloButton.style.margin = '5px'; // Añadir espacio entre botones
			poloButton.onclick = () => socket.emit('selectPolo', { selectedPoloId: polo.id });
			poloSelection.appendChild(poloButton);
		});
	});
}

// Notificación cuando Marco selecciona a un Polo y el juego termina
socket.on('gameOver', (message) => {
	roleDisplay.textContent = 'El juego ha finalizado';
	actionButton.style.display = 'none'; // Ocultar el botón de acción
	marcoNotification.textContent = message;
	marcoNotification.style.color = 'red';
});

// Notificación cuando Marco grita "Marco"
socket.on('marcoShouted', (message) => {
	marcoNotification.textContent = 'Marco ha gritado';
	marcoNotification.style.color = 'red';
});

// Escuchar cuando Polo grita "Polo" (notificación para Marco)
socket.on('poloShouted', (data) => {
	poloList.textContent = 'Polos que gritaron: ' + data.polos.map((polo) => polo.nickname).join(', ');
});

// Notificación cuando el juego empieza
socket.on('gameStarted', (message) => {
	console.log(message);
});
