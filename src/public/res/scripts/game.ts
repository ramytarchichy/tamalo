import { isObject } from "util"

const site = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port + '/socketio_tamalo'
const socket = io.connect(site)

const urlParams = new URLSearchParams(window.location.search)
const gameID = urlParams.get('id')

const divJoin = document.getElementById('join')
const divGame = document.getElementById('game')
const divRoundEnd = document.getElementById('roundEnd')
const divControls = document.getElementById('controls')
const divDrawn = document.getElementById('drawnCard')
const imgDrawn = document.getElementById('drawnCardWeight')
const ulPlayerList = document.getElementById('playerList')
const divPlayers = document.getElementById('players')

const btnViewSelf = document.getElementById('btnViewSelf')
const btnViewOther = document.getElementById('btnViewOther')
const btnSwapOther = document.getElementById('btnSwapOther')
const btnDraw = document.getElementById('btnDraw')
const btnNext = document.getElementById('btnNext')
const btnDrop = document.getElementById('btnDrop')

const imgTopCard = document.getElementById('topCard')
const ulScoreList = document.getElementById('scoreList')
//const ulActionLog = document.getElementById('actionLog')





const textBoxUsername = document.getElementById('textBoxUsername')





const screens = [
	divJoin, divGame, divRoundEnd
]

let myCardButtons: any[] = []
let playerCardButtons: any[] = []

let joined = false
let game: any = null


function logEvent(text: string): void
{
	const x = document.createElement('li')
	x.innerHTML = he.encode(text)
	//ulActionLog.appendChild(x) //TODO
}

socket.on('connect', () =>
{
	//Tell the server to join this game
	socket.emit('join', {
		gameID: gameID,
		username: textBoxUsername?.textContent
	})
})

socket.on('playerJoined', (data) =>
{
	socket.emit('syncData', {})
})

socket.on('playerQuit', (data) =>
{
	socket.emit('syncData', {})
})

socket.on('gameStateChanged', (data) =>
{
	socket.emit('syncData', {})
})

socket.on('callStop', (data) =>
{
	socket.emit('syncData', {})
	logEvent(game.players[data.index].username + ' called Tamalo!')
})

socket.on('syncData', (data) =>
{
	game = data
	updateUI()
})

socket.on('tamaloError', (data) =>
{
	socket.emit('syncData', {})
	console.log(data.error)
})

socket.on('drawnCard', (data) =>
{
	socket.emit('syncData', {})
	logEvent(game.players[game.playerTurn].username + ' has drawn a card from the deck.')
})

socket.on('nextPlayer', (data) =>
{
	logEvent(game.players[(game.playerTurn+1)%game.players.length].username + '\'s turn.')
	socket.emit('syncData', {})
})

socket.on('playerDroppedCard', (data) =>
{
	socket.emit('syncData', {})
	logEvent(game.players[game.playerTurn].username + ' dropped a card on the deck.')
})

socket.on('playerDroppedDrawn', (data) =>
{
	socket.emit('syncData', {})
	logEvent(game.players[game.playerTurn].username + ' dropped the drawn card.')
})

socket.on('playerSwappedDrawn', (data) =>
{
	socket.emit('syncData', {})
	logEvent(game.players[game.playerTurn].username + ' swapped his card (' + (data.index+1) + ') with the drawn card.')
})

socket.on('playerViewSelf', (data) =>
{
	socket.emit('syncData', {})
	logEvent(game.players[game.playerTurn].username + ' viewed his own card (' + (data.index+1) + ')')
})

socket.on('playerViewOther', (data) =>
{
	socket.emit('syncData', {})
	logEvent(game.players[game.playerTurn].username + ' viewed ' + game.players[data.player].username + '\'s card (' + (data.card+1) + ')')
})

socket.on('playerSwapOther', (data) =>
{
	socket.emit('syncData', {})
	logEvent(game.players[game.playerTurn].username + ' swapped his card (' + (data.cardIndex+1) + ') with ' + game.players[data.otherPlayerIndex].username + '\'s card (' + (data.otherCardIndex+1) + ')')
})


function updateUI()
{
	//Hide all screens
	for(let i = 0; i < screens.length; ++i)
	{
		screens[i].style.display = 'none'
	}

	//Show only current screen
	let div
	switch(game.state)
	{
	//TODO: other states

	case 'round-end':
		div = divRoundEnd
		break

	case 'not-started':
		div = divJoin
		break

	case 'in-game':
		div = divGame
		break
	}
	div.style.display = 'block'

	//Drawn card
	//TODO: show if other player takes card
	if (game.isCardDrawn === true && game.drawnCard !== null)
	{
		divDrawn.style.display = game.isCardDrawn ? 'block' : 'none'
		imgDrawn.src = site + 'res/images/cards/' + game.drawn + '.png'
		imgDrawn.alt = game.drawn
	}

	//Player list
	switch(game.state)
	{
	//TODO: other states

	case 'round-end':
		ulScoreList.innerHTML = ''
		for (let i = 0; i < game.players.length; ++i)
		{
			let player = game.players[i]
			let li = document.createElement('li')
			li.innerHTML = he.encode(player.username) + ': ' + player.score
			ulScoreList.appendChild(li)
		}
		break

	case 'not-started':
		ulPlayerList.innerHTML = ''
		for (let i = 0; i < game.players.length; ++i)
		{
			let li = document.createElement('li')
			li.innerHTML = he.encode(game.players[i].username)
			ulPlayerList.appendChild(li)
		}
		break

	case 'in-game':

		imgTopCard.src = site + 'res/images/cards/' + game.topCard + '.png'
		imgTopCard.alt = game.topCard

		//Controls
		divControls.style.display = (game.self === game.playerTurn)?'block':'none'
		btnDraw.disabled = !game.drawable
		btnNext.disabled = game.drawable || game.isCardDrawn
		btnViewSelf.disabled = !game.powers.includes('viewSelf')
		btnViewOther.disabled = !game.powers.includes('viewOther')
		btnSwapOther.disabled = !game.powers.includes('swapOther')
		btnCallStop.disabled = game.loops < 3 || game.playerStop !== null
		btnDrop.disabled = !game.droppable || game.topCard === null

		//Players
		divPlayers.innerHTML = ''
		myCardButtons = []
		playerCardButtons = []

		for (let i = 0; i < game.players.length; ++i)
		{
			let player = game.players[i]
			playerCardButtons.push([])

			let li = document.createElement('li')

			//Colors
			if (i === game.self)
			{
				li.id = 'self'
			}
			else if (i === game.playerStop)
			{
				li.id = 'stop'
			}
			else if (i === game.playerTurn)
			{
				li.id = 'current'
			}
                
			let divPlayer = document.createElement('div')
			divPlayer.innerHTML += he.encode(player.username)
			divPlayer.appendChild(document.createElement('br'))
			divPlayer.innerHTML += 'Score: ' + player.score
			li.appendChild(divPlayer)

			//Cards
			for (let j = 0; j < player.cards.length; ++j)
			{
				let card = player.cards[j]

				let btn = document.createElement('button')

				btn.classList.add('card')

				let img = document.createElement('img')
				img.src = site + 'res/images/cards/' + card.weight + '.png'
				img.classList.add('cardImage')
				img.alt = card.weight
				btn.appendChild(img)

				btn.disabled = true

				li.appendChild(btn)

				playerCardButtons[i].push(btn)

				if (i === game.self)
				{
					myCardButtons.push(btn)
				}
			}

			divPlayers.appendChild(li)
		}
		break
	}

	//Self

}

function startGame()
{
	socket.emit('voteReady', {
		//TODO: boolean isready
	})
}

function nextPlayer()
{
	socket.emit('nextPlayer', {})
}

function drawCard()
{
	socket.emit('drawCard', {})
}

function callStop()
{
	socket.emit('callStop', {})
}

function dropDrawn()
{
	socket.emit('dropDrawn', {})
	divDrawn.style.display = 'none'
}

function selectSwapDrawn()
{
	//Enable buttons
	for (let i = 0; i < myCardButtons.length; ++i)
	{
		let btn = myCardButtons[i]
		btn.disabled = false
		btn.onclick = ()=>{swapDrawn(i)}
	}

	//Hide popup
	divDrawn.style.display = 'none'
}

function swapDrawn(index)
{
	socket.emit('swapDrawn', {
		index: index
	})
}

function powerViewSelf()
{
	for (let i = 0; i < myCardButtons.length; ++i)
	{
		let btn = myCardButtons[i]

		btn.disabled = false
		btn.onclick = () => {viewSelf(i)}
	}
}

function viewSelf(index)
{
	socket.emit('viewSelf', {
		index: index
	})
}

function powerViewOther()
{
	for (let i = 0; i < playerCardButtons.length; ++i)
	{
		for (let j = 0; j < playerCardButtons[i].length; ++j)
		{
			let btn = playerCardButtons[i][j]

			//Enable all cards except self
			if (i === game.self)
			{
				btn.disabled = true
			}
			else
			{
				btn.disabled = false
				btn.onclick = () => {viewOther(i, j)}
			}
		}
	}
}
//TODO: stop not working
function viewOther(playerIndex, cardIndex)
{
	socket.emit('viewOther', {
		player: playerIndex,
		card: cardIndex
	})
}

function powerSwapOther()
{
	for (let i = 0; i < myCardButtons.length; ++i)
	{
		let btn = myCardButtons[i]

		btn.disabled = false
		btn.onclick = () => {selectSwap(i)}
	}
}

let selectedSwap
function selectSwap(index)
{
	selectedSwap = index

	for (let i = 0; i < myCardButtons.length; ++i)
	{
		let btn = myCardButtons[i]
		btn.disabled = true
	}

	for (let i = 0; i < playerCardButtons.length; ++i)
	{
		for (let j = 0; j < playerCardButtons[i].length; ++j)
		{
			let btn = playerCardButtons[i][j]

			btn.disabled = false
			btn.onclick = () => {swapOther(selectedSwap, i, j)}
		}
	}
}

function swapOther(myCard, otherPlayer, otherCard)
{
	socket.emit('swapOther', {
		cardIndex: myCard,
		otherPlayerIndex: otherPlayer,
		otherCardIndex: otherCard
	})
}

function clickDrop()
{
	for (let i = 0; i < myCardButtons.length; ++i)
	{
		let btn = myCardButtons[i]

		btn.disabled = false
		btn.onclick = () => {dropCard(i)}
	}
}

function dropCard(index)
{
	socket.emit('dropCard', {
		index: index
	})
}
