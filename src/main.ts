import * as  express from 'express'
import * as bodyParser from 'body-parser'
import * as http from 'http'
import * as helmet from 'helmet'
import * as io from 'socket.io'
import { GameServer } from './Game/GameServer'


//Web server
const app = express()
const server = http.createServer(app)

//Socket.IO server
const socketServer = io(server).of('/socketio_tamalo')

//Game Server
const gameServer = new GameServer(socketServer)
gameServer.validator = (username): boolean =>
{
	const pattern = /^[`~!@#$%^&*<>(){}[\]_-+=|\\'";:,./?a-z0-9]{1,20}$/i
	return pattern.exec(username) !== null
}


//Web requests

app.get('/', (req, res) =>
{
	res.render('index')
})

app.get('/about', (req, res) =>
{
	res.render('about')
})

app.get('/privacy', (req, res) =>
{
	res.render('privacy')
})

app.get('/licence', (req, res) =>
{
	res.render('licence')
})

app.get('/new_game', (req, res) =>
{
	res.render('new_game')
})

app.post('/new_game', (req, res) =>
{
	const game = gameServer.createGame()
	res.redirect('/game?id=' + game.id)
})

app.get('/game', (req, res) =>
{
	const id: string | null = req.query.id
	if (id)
	{
		const game = gameServer.getGame(id)
		if (game)
		{
			res.render('game')
		}
		else
		{
			res.render('not_found')
		}
	}
	else
	{
		res.redirect('/')
	}
})


//Express middleware and settings
app.use(helmet())
app.use(express.static(__dirname + '/public'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.set('views', __dirname + '/views')
app.set('view engine', 'pug')
app.locals.pretty = true


//Run server
const port = 8080
server.listen(port, () =>
{
	console.log('Server running on port ' + port)
})
