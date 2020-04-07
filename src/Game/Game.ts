import * as crypto from 'crypto'
import base64url from 'base64url'
import { GameState } from './GameState'
import { Player } from './Player'
import { Card } from './Card'
import { Power } from './Power'
import { shuffle } from './utils'
import { GameError } from './GameError'

export class Game
{
	players: Player[] = []
	state: GameState
	powers: Power[]
	drawable: boolean
	drawn: number | null

	private _playerTurnIndex: number
	private _playerStopIndex: number | null
	private _id: string
	private _loops: number
	private _droppable: boolean
	private _topCard: number
	private _round: number
	private cardsPushed = 0
	private deck: number[]


	constructor()
	{
		this._id = base64url.encode(crypto.randomBytes(8))

		this.state = GameState.ROUND_ENDED
		this.nextRound()//TODO: change to resetGame()
		this._round = 0
		this.state = GameState.NOT_STARTED
	}


	nextRound(): void
	{
		this.requireState(GameState.ROUND_ENDED, () =>
		{
			//Reset Deck
			this.deck = [
				0, 0,
				1, 1, 1, 1,
				2, 2, 2, 2,
				3, 3, 3, 3,
				4, 4, 4, 4,
				5, 5, 5, 5,
				6, 6, 6, 6,
				7, 7, 7, 7,
				8, 8, 8, 8,
				9, 9, 9, 9,
				10, 10, 10, 10,
				11, 11, 11, 11,
				12, 12, 12, 12,
				13, 13
			]
			this.shuffleDeck()
			shuffle(this.players)

			//Reset game data
			this._round++
			this._loops = 0
			this._droppable = true
			this._topCard = this.getCard()
			this._playerTurnIndex = 0
			this._playerStopIndex = null
			this.powers  = []
			this.drawable = true
			this.drawn = null

			//Players
			for (const player of this.players)
			{
				//Remove all cards
				player.cards = []

				//Add 4 cards
				for(let i = 0; i < 4; ++i)
				{
					player.cards.push(new Card(this.getCard()))
				}

				//See first 2 cards
				for(let i = 0; i < 2; ++i)
				{
					const card = player.cards[i]
					card.seenBy.push(player)
				}
			}

			this.state = GameState.IN_GAME
		})
	}


	nextPlayer(): void
	{
		//Next player
		this.powers = []
		this.drawable = true
		this.drawn = null
		this._playerTurnIndex++
		this._playerTurnIndex %= this.players.length

		if (this._playerTurnIndex === 0)
		{
			this._loops++
		}

		//If this player called stop, end the round and calculate scores
		if (this.playerTurn === this.playerStop)
		{
			//Stop game
			this.state = GameState.ROUND_ENDED

			//Calculate everyone else's score
			let stopPlayerWon = true
			for (const player of this.players)
			{
				if (player !== this.playerStop)
				{
					//Check if the player won
					if (player.points <= this.playerStop.points)
					{
						stopPlayerWon = false
					}
					
					//Add points for everyone else
					player.score -= player.points
				}
			}

			//Adjust stop player score
			if (stopPlayerWon)
			{
				this.playerStop.score += 10
			}
			else
			{
				this.playerStop.score -= 10 + this.playerStop.points
			}
		}
	}


	broadcast(event: string, message: any): void
	{
		for (const player of this.players)
		{
			player.emit(event, message)
		}
	}


	drawCard(): void
	{
		this.requireState(GameState.IN_GAME, () =>
		{
			if (this.drawable)
			{
				this.drawn = this.getCard()
				this.drawable = false
			}
			else
			{
				throw new GameError('Cannot draw anymore')
			}
		})
	}


	get playerTurnIndex(): number
	{
		return this._playerTurnIndex
	}


	get playerStopIndex(): number | null
	{
		return this._playerStopIndex
	}


	get playerTurn(): Player
	{
		return this.players[this.playerTurnIndex]
	}


	get playerStop(): Player | null
	{
		return this.playerStopIndex === null ? null : this.players[this.playerStopIndex]
	}


	get round(): number
	{
		return this._round
	}


	get topCard(): number
	{
		return this._topCard
	}


	get droppable(): boolean
	{
		return this._droppable
	}


	get loops(): number
	{
		return this._loops
	}


	get id(): string
	{
		return this._id
	}


	pushCard(points: number): void
	{
		//Add card to deck
		this.deck.push(this.topCard)
		this._topCard = points

		//Keep track of pushed cards
		this.cardsPushed++
	}


	private shuffleDeck(): void
	{
		this.cardsPushed = 0
		shuffle(this.deck)
	}


	private getCard(): number
	{
		//Prevent cheaters from predicting which cards other people have drawn
		if (this.cardsPushed >= this.deck.length)
			this.shuffleDeck()

		//Get a card
		return this.deck.splice(0, 1)[0]
	}
	

	private requireState(state: GameState, fun: () => any): void
	{
		if (this.state === state)
		{
			fun()
		}
		else
		{
			throw new GameError('Wrong game state')
		}
	}


	private requireJoined(player: Player, fun: () => any): void
	{
		if (this.players.includes(player))
		{
			fun()
		}
		else
		{
			throw new GameError('Not joined game')
		}
	}


	private requireTurn(player: Player, fun: () => any): void
	{
		this.requireState(GameState.IN_GAME, () =>
		{
			if (this.playerTurn === player)
			{
				fun()
			}
			else
			{
				throw new GameError('Not your turn')
			}
		})
	}
}
