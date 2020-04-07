import { Socket, Namespace } from 'socket.io'
import { Player } from './Player'
import { Game } from './Game'
import { isString, isNullOrUndefined } from 'util'
import { GameState } from './GameState'
import { Power } from './Power'
import { GameError } from './GameError'


function handleClientErrors(client: Socket, fun: () => any): void
{
	try
	{
		fun()
	}
	catch(e)
	{
		if (e instanceof GameError)
		{
			client.emit('gameError', e)
		}
		else
		{
			//Rethrow
			throw e
		}
	}
}


function validate(input: any): void
{
	if (typeof(input) !== 'object' || isNullOrUndefined(input))
	{
		throw new GameError('Argument is not an object')
	}
}


function validateIndex(index: any, upperBound: number): void
{
	if (!Number.isSafeInteger(index))
	{
		throw new GameError('Invalid argument')
	}

	if (index < 0 || index >= upperBound)
	{
		throw new GameError('Index out of range')
	}
}


function validateString(input: any): void
{
	if (!isString(input))
	{
		throw new GameError('Invalid argument')
	}
}


export class GameServer
{
	validator: ((username: string) => boolean) | null = null //TODO: implement check below

	private cookieMap: Map<string, Player> = new Map()
	private clientMap: Map<Socket, Player> = new Map()
	private gameMap: Map<string, Game> = new Map()


	constructor(socketServer: Namespace)
	{
		socketServer.on('connection', (client) =>
		{
			client.on('join', (data) =>
			{
				handleClientErrors(client, () =>
				{
					//Validate data
					validate(data)
					validateString(data.gameID)
					validateString(data.username)

					//Check if game exists
					const game = this.gameMap.get(data.gameID)
					if (game !== undefined)
					{
						if (game.state === GameState.NOT_STARTED)
						{
							//Validate username
							if (this.validator === null || this.validator(data.username))
							{
								//Join Game
								const p = new Player(game, data.username, client)

								game.broadcast('playerJoined', {
									index: game.players.indexOf(p)
								})
							}
							else
							{
								throw new GameError('Invalid username')
							}
						}
						else
						{
							throw new GameError('Cannot join game at this time')
						}
					}
					else
					{
						throw new GameError('No such game')
					}
				})
			})


			client.on('disconnect', () =>
			{
				//Mark as disconnected
				const player = this.clientMap.get(client)
				if (player !== undefined)
				{
					player.isConnected = false
				}
			})


			client.on('reconnect', () =>
			{
				//Mark as connected
				const player = this.clientMap.get(client)
				if (player !== undefined)
				{
					player.isConnected = true
				}
			})


			client.on('syncData', () =>
			{
				this.requireJoin(client, (player) =>
				{
					player.emit('syncData', {})
				})
			})


			client.on('voteReady', (data) =>
			{
				this.requireGameState(client, GameState.NOT_STARTED, (player, game) =>
				{
					//Update player ready state
					player.isReady = data.isReady

					//Tell everyone
					game.broadcast('voteReady', {
						player: game.players.indexOf(player),
						state: data.isReady
					})

					//Check if all players are ready
					let ready = true
					for (const p of game.players)
					{
						if (!p.isReady)
						{
							ready = false
							break
						}
					}

					//Mom's spaghetti, it's ready
					if (ready)
					{
						game.state = GameState.IN_GAME

						game.broadcast('gameStateChanged', {
							state: game.state
						})
					}
				})
			})


			client.on('drawCard', () =>
			{
				this.requireTurn(client, (player, game) =>
				{
					if (game.drawable && game.drawn === null)
					{
						game.drawCard()
						game.broadcast('drawnCard', {})
					}
					else
					{
						throw new GameError('Cannot draw any more cards')
					}
				})
			})


			client.on('nextPlayer', () =>
			{
				this.requireTurn(client, (player, game) =>
				{
					if (!game.drawable && game.drawn === null)
					{
						game.nextPlayer()

						if (game.state === GameState.IN_GAME)
						{
							game.broadcast('nextPlayer', {
								index: game.playerTurnIndex
							})
						}
						else
						{
							game.broadcast('gameStateChanged', {
								state: game.state
							})
						}
					}
					else
					{
						throw new GameError('Your turn is not complete yet')
					}
				})
			})


			client.on('dropCard', (data) =>
			{
				this.requireGameState(client, GameState.IN_GAME, (player, game) =>
				{
					//Validate Data
					validate(data)
					validateIndex(data.card, player.cards.length)

					if (game.droppable)
					{
						//game.
					}
					else
					{
						throw new GameError('Cannot drop cards at this time')
					}
				})
			})


			client.on('dropDrawn', () =>
			{
				this.requireTurn(client, (player, game) =>
				{
					if (game.drawn !== null)
					{
						//TODO
					}
					else
					{
						throw new GameError('No card drawn')
					}
				})
			})


			client.on('swapDrawn', (data) =>
			{
				this.requireTurn(client, (player, game) =>
				{
					//Validate Data
					validate(data)
					validateIndex(data.card, player.cards.length)

					if (game.drawn !== null)
					{
						//TODO
					}
					else
					{
						throw new GameError('No card drawn')
					}
				})
			})


			client.on('powerViewSelf', (data) =>
			{
				this.requirePower(client, Power.VIEW_SELF, (player, game) =>
				{
					validateIndex(data.card, player.cards.length)

					const card = player.cards[data.card]
					if (card.seenBy.indexOf(player) === -1)
					{
						card.seenBy.push(player)

						//Remove power after use
						game.powers.splice(game.powers.indexOf(Power.VIEW_SELF), 1)

						game.broadcast('playerViewSelf', {
							card: data.card
						})
					}
					else
					{
						throw new GameError('Already seen this card')
					}
				})
			})


			client.on('powerViewOther', (data) =>
			{
				this.requirePower(client, Power.VIEW_OTHER, (player, game) =>
				{
					validateIndex(data.player, game.players.length)
					const p = game.players[data.player]
					validateIndex(data.card, p.cards.length)

					const card = p.cards[data.card]
					if (card.seenBy.indexOf(player) === -1)
					{
						card.seenBy.push(player)

						//Remove power after use
						game.powers.splice(game.powers.indexOf(Power.VIEW_OTHER), 1)

						game.broadcast('playerViewOther', {
							player: data.player,
							card: data.card
						})
					}
					else
					{
						throw new GameError('Already seen this card')
					}
				})
			})


			client.on('powerSwapOther', (data) =>
			{
				this.requirePower(client, Power.SWAP_OTHER, (player, game) =>
				{
					validateIndex(data.ownCard, player.cards.length)
					validateIndex(data.otherPlayer, game.players.length)
					const otherPlayer = game.players[data.otherPlayer]
					validateIndex(data.otherCard, otherPlayer.cards.length)

					const ownCard = player.cards[data.ownCard]
					const otherCard = otherPlayer.cards[data.otherCard]

					player.cards[data.ownCard] = otherCard
					otherPlayer.cards[data.otherCard] = ownCard

					//Remove power after use
					game.powers.splice(game.powers.indexOf(Power.SWAP_OTHER), 1)

					game.broadcast('playerSwapOther', {
						ownCard: data.ownCard,
						otherPlayer: data.otherPlayer,
						otherCard: data.otherCard
					})
				})
			})
		})
	}


	createGame(): Game
	{
		const game = new Game()
		this.gameMap.set(game.id, game)
		return game
	}


	getGame(id: string): Game | undefined
	{
		return this.gameMap.get(id)
	}


	private requireJoin(client: Socket, fun: (player: Player, game: Game) => any): void
	{
		handleClientErrors(client, () =>
		{
			const player = this.clientMap.get(client)
			if (player === undefined)
			{
				//TODO: error
			}
			else
			{
				fun(player, player.game)
			}
		})
	}


	private requireGameState(client: Socket, state: GameState, fun: (player: Player, game: Game) => any): void
	{
		this.requireJoin(client, (player, game) =>
		{
			if (game.state === state)
			{
				fun(player, game)
			}
			else
			{
				//TODO: error
			}
		})
	}


	private requireTurn(client: Socket, fun: (player: Player, game: Game) => any): void
	{
		this.requireGameState(client, GameState.IN_GAME, (player, game) =>
		{
			if (game.playerTurn === player)
			{
				fun(player, game)
			}
			else
			{
				//TODO: error
			}
		})
	}


	private requirePower(client: Socket, power: Power, fun: (player: Player, game: Game) => any): void
	{
		this.requireTurn(client, (player, game) =>
		{
			if (game.powers.includes(power))
			{
				fun(player, game)
			}
			else
			{
				//TODO: error
			}
		})
	}
}
