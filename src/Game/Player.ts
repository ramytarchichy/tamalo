import { Socket } from 'socket.io'
import { Card } from './Card'
import { Game } from './Game'
import { GameError } from './GameError'

export class Player
{
	score = 0
	cards: Card[] = []
	isConnected = true
	isReady = false

	private _name: string
	private _game: Game
	private _socket: Socket


	constructor(game: Game, name: string, socket: Socket)
	{
		this._game = game
		this._name = name
		this._socket = socket

		game.players.push(this)
	}


	dropCard(card: Card): void
	{
		if (this.game.droppable)
		{
			this.game.pushCard(card.points)
		}
		else
		{
			throw new GameError('Cannot drop card at this time')
		}
	}


	get syncData(): any
	{
		const data = {
			id: this.game.id,
			state: this.game.state,
			round: this.game.round,
			loops: this.game.loops,
			self: this.game.players.indexOf(this),
			players: [] as any[],
			playerTurn: this.game.playerTurnIndex,
			playerStop: this.game.playerStopIndex,
			topCard: this.game.topCard,
			powers: this.game.powers,
			drawable: this.game.drawable,
			droppable: this.game.droppable,
			isDrawn: this.game.drawn !== null,
			drawn: this.game.playerTurn === this ? this.game.drawn : null
		}

		//Players
		for (const player of this.game.players)
		{
			const playerData = {
				score: player.score,
				name: player.name,
				connected: player.socket !== null,
				cards: [] as any[]
			}

			//Cards
			for (const card of player.cards)
			{
				const c = {
					points: card.seenBy.indexOf(this) === -1 ? null : card.points,
					seenBy: [] as number[]
				}

				//Seen by
				for (const p of card.seenBy)
				{
					c.seenBy.push(this.game.players.indexOf(p))
				}

				playerData.cards.push(c)
			}

			data.players.push(playerData)
		}

		return data
	}


	emit(event: string, message: any): void
	{
		const m = message
		m.syncData = this.syncData

		this.socket?.emit(event, m)
	}


	get points(): number
	{
		let i = 0
		for (const card of this.cards)
		{
			i += card.points
		}

		return i
	}

	get name(): string
	{
		return this._name
	}


	get game(): Game
	{
		return this._game
	}


	get socket(): Socket
	{
		return this._socket
	}


	get isTurn(): boolean
	{
		return this.game.playerTurn === this
	}
}
