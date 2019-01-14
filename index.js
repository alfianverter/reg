"use strcit";

const Web3 = require("web3");
const Discord = require("discord.js");
const BigNumber = require('bignumber.js');
const Tx = require("ethereumjs-tx");
const fs = require("fs");
const botSettings = require("./my.json");
const price = require("./price.js");
// update price every 5 min
setInterval(price,300000);

const prefix = botSettings.prefix;

const bot = new Discord.Client({disableEveryone:true});

var web3 = new Web3();

web3.setProvider(new web3.providers.HttpProvider('http://localhost:9656'));


bot.on('ready', ()=>{
	console.log("Bot is ready for work");
});

function sendCoins(address,value,message,name){

	web3.eth.sendTransaction({
	    from: botSettings.address,
	    to: address,
	    gas: web3.utils.toHex(120000),
	    value: value
	})
	.on('transactionHash', function(hash){
		// sent pm with their tx
		// recive latest array
		if(name != 1){
			let author = bot.users.find('username',name);
			author.send("Hi "+name+" , you are lucky man.\n Check hash: http://www.gander.tech/tx/"+ hash);
		} else {
			message.channel.send("Tip was sent. \n Check hash: http://www.gander.tech/tx/"+ hash)
		}
		
	    
	})
	.on('error', console.error);
}


function raining(amount,message){
	// registered users
	var data = getJson('data/users.json');
	// online users
	var onlineUsers = getOnline();
	// create online and register array
	var onlineAndRegister = Object.keys(data).filter(username => {return onlineUsers.indexOf(username)!=-1});
	// create object with name - address and name - values
	var latest = {};
	for (let user of onlineAndRegister) {
	  if (data[user]) {
	    latest[data[user]] = user;
	  }
	}
	// if use wrong amount (string or something)
	var camount = amount/Object.keys(latest).length;
	var weiAmount = camount*Math.pow(10,18);
	
	message.channel.send("It just **rained** on **" + Object.keys(latest).length + "** users. Check pm's." );
	
	function rainSend(addresses){
		for(const address of Object.keys(addresses)){
			
			let name = addresses[address];
			sendCoins(address,weiAmount,message,name);
		}
	}
	// main function
	rainSend(latest);
}

// return array with names of online users
function getOnline(){
	var onlineList = [];
	var users = bot.users;
	users.keyArray().forEach((val) => {
		var userName = users.get(val).username;
		var status = users.get(val).presence.status;
		if(status == "online"){
			onlineList.push(userName);
		}
	});
	return onlineList;
}

function getJson(path){
	return JSON.parse(fs.readFileSync(path));
}


bot.on('message',async message => {
	
	// Not admins cannot use bot in general channel
	if(message.channel.name === 'general' && !message.member.hasPermission('ADMINISTRATOR')) return;
	if(message.author.bot) return;
	if(message.channel.type === "dm") return;


	var message = message;
	let args = message.content.split(' ');

	if(message.content.startsWith(prefix + "sendToAddress ")){ 
		if(!message.member.hasPermission('ADMINISTRATOR')){
			return message.channel.send("You cannot use '/send' command.");
		} 
		let address = args[1];
		let amount = Number(args[2]);
		// if use wrong amount (string or something)
		if (!amount) return message.channel.send("Error with wrong amount.");
		let weiAmount = amount*Math.pow(10,18);

		if(web3.utils.isAddress(args[1])){
			if(amount>10){
				message.channel.send("You try to send more that 10 EXP.");
			} else {
				// main function
				message.channel.send("You try to send " + amount + " EXP to " + address + " address.");
				sendCoins(address,weiAmount,message,1);
			}
		} else {
			message.channel.send("Wrong address to send.");
		}
	}

	if(message.content.startsWith(prefix + "send ")){
		if(!message.member.hasPermission('ADMINISTRATOR')){
			return message.channel.send("You cannot use '/send' command.");
		}
		let user = args[1];
		let amount = Number(args[2]);
		// if use wrong amount (string or something)
		if (!amount) return message.channel.send("Error - you've entered wrong amount.");
		
		let weiAmount = amount*Math.pow(10,18);
		let data = getJson('data/users.json');
		if(Object.keys(data).includes(user)){
			let address = data[user];
			message.channel.send("You try to send " + amount+ " EXP to @"+user  );
			sendCoins(address,weiAmount,message,1); // main function
		} else {
			message.channel.send("This user is not registered.");
		}

	}

	if(message.content.startsWith(prefix + "rain")){		
		if(!message.member.hasPermission('ADMINISTRATOR')){
			return message.channel.send("You cannot use '/rain' command");
		} 
		var amount = Number(args[1]);
		if (!amount) return message.channel.send("Error - you've entered wrong amount");
		// main func
		raining(amount,message);
		
	}
	//
	if(message.content.startsWith(prefix + "coming ")){
		if(!message.member.hasPermission('ADMINISTRATOR')){
			return message.channel.send("You cannot use '/rain' command");
		} 	
		let amount = Number(args[1]);
		//if use wrong amount (string or something)
		if(!amount) return message.channel.send("Error - you've entered wrong amount");
		let time = Number(args[2])*3600000;
		if(!time) return message.channel.send("Please, set hours correctly");
		 // 1 hour = 3 600 000 milliseconds
		message.channel.send("Raining will be after **" + args[2] + "** hours.");
		
		// main func
		setTimeout(function(){
			raining(amount,message);
		},time);
		
	}

	if(message.content.startsWith(prefix + "balance")){
		let price = getJson('data/usdprice.txt');
		let author = message.author.username;
		let address = args[1];
		if(address == null){
			// show registered address balance
			let data = getJson('data/users.json');
			if(data[author]){
				web3.eth.getBalance(data[author], (error,result)=>{
					if(!error){
						let balance = (result/Math.pow(10,18)).toFixed(3);
						let usdBalace = new Intl.NumberFormat('us-US').format(parseInt(balance*price));
						if(balance > 10000){
							message.channel.send(`This balance has: **${balance}** EXP (or *${usdBalace} USD*), congrats, you are an EXP whale. Address: ${data[author]}.`);
						} else if(balance > 100 && balance < 1000) {
							message.channel.send(`This balance has: **${balance}** EXP (or *${usdBalace} USD*), you are small Exp whale.Address: ${data[author]}.`)
						} else if(balance > 1000 && balance < 3000) {
							message.channel.send(`This balance has: **${balance}** EXP (or *${usdBalace} USD*), you are middle Exp whale.Address: ${data[author]}.`)
						} else if(balance == 0){
							message.channel.send(`This balance empty, it has: **${balance}** EXP.Addres: ${data[author]}.`);
						} else {
							message.channel.send(`Your balance is **${balance}** EXP (or *${usdBalace} USD*), you need more EXP  to become a whale.Address: ${data[author]}.`);
						}
					}
				})
				return
			} 
		}
		if(web3.utils.isAddress(address)){
			web3.eth.getBalance(address, (error,result)=>{
				if(!error){
					var balance = (result/Math.pow(10,18)).toFixed(3);
					let usdBalace = new Intl.NumberFormat('us-US').format(parseInt(balance*price));
					if(balance > 10000){
						message.channel.send(`This balance has: **${balance}** EXP (or *${usdBalace} USD*), congrats, you are Exp whale. Address: ${address}.`);
					} else if(balance == 0){
						message.channel.send(`This balance empty, it has: **${balance}** EXP. Address: ${address}.`);
					} else {
						message.channel.send(`Your balance is **${balance}** EXP (or *${usdBalace} USD*), you need more EXP  to become a whale. Address: ${address}.`);
					}
				} else {
					message.channel.send("Oops, some problem occured with your address.");
				}
			})
		} else {
			message.channel.send("Wrong address, try another one.");
		}	
	}

	if(message.content === prefix + "getaddress"){
		let balance = await web3.eth.getBalance(botSettings.address)/Math.pow(10,18);
		message.channel.send("Bot address is " + botSettings.address + " with: **" + Number(balance).toFixed(3) + "** EXP.");
	}
	
	if(message.content.startsWith("/register")){
		var author = message.author.username;
		var address = args[1];

		if(web3.utils.isAddress(args[1])){	
			var data = getJson('data/users.json');			
			if(!Object.values(data).includes(address) && !Object.keys(data).includes(author)){		
				data[author] = address;
				message.channel.send("@" + author + " registered new address: " + address);
				
				fs.writeFile(botSettings.path, JSON.stringify(data), (err) => {
				  if (err) throw err;
				  console.log('The file has been saved.');
				});	
				
			} else {
				message.channel.send("You have already registered.");
			}
		} else {
			message.channel.send("@" + author + " tried to register wrong address. Try another one. Correct format is **/register 0xAddress**");
		}
	}

	if(message.content.startsWith(prefix + "changeRegister")){
		var author = message.author.username;
		var address = args[1];
		if(web3.utils.isAddress(args[1])){
			var data = getJson('data/users.json');
			if(Object.keys(data).includes(author)){
				if(address != data[author]){
					data[author] = address;
					fs.writeFile(botSettings.path, JSON.stringify(data), (err) => {
				  		if (err) throw err;
				  		console.log('The file has been changed.');
					});	
					message.channel.send("@" + author + " changed register address to " + address);
				} else {
					message.channel.send("Use another address if you're trying to change your old one.")
				}
			} else {
				message.channel.send("You are not on the list, register your address via **/register** first.");
			}
		} else {
			message.channel.send("@"+author+" tried to register with wrong address. Correct format is **/register 0xAddress**");
		}
	}
	//-------------------------------------
	if(message.content == prefix + "list"){
		var data = getJson('data/users.json');	
		message.channel.send("Total amount of registered users is **" + Object.keys(data).length+ "**.");

	}
	if(message.content == prefix + "checkRegister"){
		let author = message.author.username;
		let data = getJson('data/users.json');
		if(Object.keys(data).includes(author)){
			message.channel.send("@"+author + " already registered.");
		} else {
			message.channel.send("You are not in the list, use **/register** command fist.");
		}
	}

	if(message.content === prefix + "help"){
		message.channel.send("ExpTipBit commands:\n"+
			"**"+prefix+"balance** *<address>* -  show EXP balance on the following address \n"+
			"**"+prefix+"sendToAddress** *<address>* *<amount>* - send EXP to the following address (Admin Only)\n"+
			"**"+prefix+"send** *<name>* *<amount>* send EXP to the following user (Admin Only)\n"+
			"**"+prefix+"rain** *<amount>* - send EXP to all registered and online address's (Admin Only).\n"+
			"**"+prefix+"coming** *<amount>* *<numOfHrs>* - rain will be after N hours (Admin Only). \n"+
			"**"+prefix+"getaddress** - shows bot address so everyone can fund it. \n" + 
			"**"+prefix+"register** *<address>*  - saves user address and name to db. \n"+
			"**"+prefix+"changeRegister** *<address>* -  change your registered address.\n"+
			"**"+prefix+"checkRegister** -  find whether you're registered or not.\n"+
			"**"+prefix+"list** - shows number of registered users.");
	}
})


bot.login(botSettings.token);
