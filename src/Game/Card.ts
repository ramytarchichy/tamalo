import { Player } from './Player'

export class Card
{
	seenBy: Player[] = []
	
	private _points: number
	

	constructor(points: number)
	{
		this._points = points
	}


	get points(): number
	{
		return this._points
	}
}
