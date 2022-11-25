var fs = require('fs');
const secrets = require('./secrets.json');

var connected = 0
var hits = 0

var imageCache = {
	"prac": {},
	"uceb": {}
}
var optionsCache = {
	"prac": {},
	"uceb": {}
}

var testCache = {}

const errImg = fs.readFileSync(`./img/err.png`,"base64")

const app = require('express')()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const port = 5000

app.get('/nemcina', (req, res) => {
	res.sendFile(__dirname + '/index.html')
})
app.get('/', (req, res) => {
	res.redirect("/nemcina")
})
server.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})

io.on('connection', (socket) => {
	connected++;
	socket.emit('initialData', optionsCache)
	socket.on('disconnect', () => {
		connected--;
	})
	socket.on("getPicture", (data)=>{
		hits++;
		if (data.base !== "test") {
			socket.emit("picture", {"img":[imageCache[data.base][data.kapitola][data.part][data.cvicenie]]})
		} else {
			if (secrets.usernames.includes(data.part) && secrets.passwords.includes(data.cvicenie)){
				socket.emit("picture", {"img":testCache[data.kapitola]})
			}else{
				socket.emit("picture", {"img":[errImg]})
			}
		}
	})
})

const pulse = setInterval(()=>{
	if (connected > 0) {
		const used = process.memoryUsage();
		let o = {}
		for (let key in used) {
			o[key] = `${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`
		}
		io.emit("status",{
			"connections": connected,
			"uptime": `${process.uptime()} s`,
			"hits": hits,
			"memory": o
		})
	}
}, 5000)
    

function rebuildImageCache() {
	function build(base){
		var folders = fs.readdirSync(`./img/${base}`, {withFileTypes: true}).filter(dirent => dirent.isDirectory() && dirent.name !== "struc").map(dirent => dirent.name)
		let out = {}
		folders.forEach(folder => {
			out[folder] = fs.readdirSync(`./img/${base}/${folder}`, {withFileTypes: true}).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name)
		})
		Object.keys(out).forEach(key => {
			out[key] = Object.assign({}, ...out[key].map(k => ({[k]: ""})))
			Object.keys(out[key]).forEach(subKey => {
				out[key][subKey] = fs.readdirSync(`./img/${base}/${key}/${subKey}`,{withFileTypes: true}).filter(file => file.name.endsWith(".png") || file.name.endsWith(".PNG")).map(file => file.name.toString())
			})
		})
		optionsCache[base] = JSON.parse(JSON.stringify(out))
		Object.keys(out).forEach(key => {
			Object.keys(out[key]).forEach(subKey => {
				out[key][subKey] = Object.assign({}, ...out[key][subKey].map(k => ({[k]: ""})))
				Object.keys(out[key][subKey]).forEach(pngName => {
					out[key][subKey][pngName] = fs.readFileSync(`./img/${base}/${key}/${subKey}/${pngName}`,"base64")
				})
			})
		})
		return out
	}
	imageCache = {
		"prac": build("prac"),
		"uceb": build("uceb")
	}
	io.sockets.emit("initialData", optionsCache)
	let out = {}
	let folders = fs.readdirSync(`./img/test`, {withFileTypes: true}).filter(dirent => dirent.isDirectory() && dirent.name !== "struc").map(dirent => dirent.name)
	folders.forEach(folder => {
		out[folder] = fs.readdirSync(`./img/test/${folder}`,{withFileTypes: true}).filter(file => file.name.endsWith(".png") || file.name.endsWith(".PNG")).map(file => file.name.toString()).map(val=>fs.readFileSync(`./img/test/${folder}/${val}`,"base64"))
	})
	testCache = out
}

rebuildImageCache()



/*
process.uptime()
const used = process.memoryUsage();
for (let key in used) {
  console.log(`Memory: ${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
}

*/
