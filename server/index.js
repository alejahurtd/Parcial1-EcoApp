const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(express.json());
app.use(cors());

const httpServer = createServer(app);

const io = new Server(httpServer, {
	path: '/real-time',
	cors: {
		origin: '*',
	},
});

const db = {
	players: [],
	marco: null,
	polos: [],
	poloEspecial: null,
};

io.on('connection', (socket) => {
	// Evento para unirse al juego
	socket.on('joinGame', (user) => {
		db.players.push({ ...user, id: socket.id });
		console.log(`${user.nickname} se ha unido al juego`);

		io.emit('playerCountUpdated', db.players.length);
	});

	socket.on('startGame', () => {
		if (db.players.length < 3) {
			socket.emit('error', 'Se necesitan al menos 3 jugadores para empezar');
			return;
		}

		console.log('Juego iniciado');

		let marcoIndex = Math.floor(Math.random() * db.players.length);
		let poloEspecialIndex;

		do {
			poloEspecialIndex = Math.floor(Math.random() * db.players.length);
		} while (poloEspecialIndex === marcoIndex);

		db.players.forEach((player, index) => {
			let role;
			if (index === marcoIndex) {
				role = 'Marco';
				db.marco = player;
			} else if (index === poloEspecialIndex) {
				role = 'Polo especial';
				db.poloEspecial = player;
			} else {
				role = 'Polo';
			}

			io.to(player.id).emit('roleAssigned', { role });
		});

		io.emit('gameStarted', 'El juego ha comenzado. ¡Buena suerte!');
	});

	socket.on('notifyMarco', () => {
		console.log('Marco ha gritado');
		db.polos = [];
		io.emit('marcoShouted', 'Marco ha gritado');
	});

	socket.on('notifyPolo', () => {
		const polo = db.players.find((player) => player.id === socket.id);
		if (polo) {
			db.polos.push(polo);
			console.log(`${polo.nickname} ha gritado Polo`);

			// Enviar la lista de Polos a Marco
			io.to(db.marco.id).emit('poloShouted', { polos: db.polos });
		}
	});

	// Enviar lista de Polos a Marco para que seleccione
	socket.on('notifyMarco', () => {
		const polos = db.players.filter((player) => player !== db.marco);
		io.to(db.marco.id).emit('polosList', polos);
	});

	// Manejar cuando Marco selecciona un Polo
	socket.on('selectPolo', ({ selectedPoloId }) => {
		const selectedPolo = db.players.find((player) => player.id === selectedPoloId);

		if (selectedPolo) {
			if (selectedPolo === db.poloEspecial) {
				// Si Marco selecciona el Polo especial, el juego termina
				io.emit('gameOver', 'El juego ha finalizado. Marco seleccionó al Polo especial.');
			} else {
				[db.marco, selectedPolo] = [selectedPolo, db.marco];
				io.emit('gameOver', 'El juego ha finalizado. Roles intercambiados.');
			}
		}
	});

	// Limpiar cuando el jugador se desconecta
	socket.on('disconnect', () => {
		db.players = db.players.filter((player) => player.id !== socket.id);
		io.emit('playerCountUpdated', db.players.length);
	});
});

httpServer.listen(5050, () => {
	console.log(`Server is running on http://localhost:5050`);
});
