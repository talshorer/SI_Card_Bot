/**
 * Initial index page that sets up the Discord bot and loads other commands
 */

require("dotenv").config();
const fs = require("fs");
const Discord = require("discord.js");

const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  ActivityType,
} = require("discord.js");
const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

const PREFIX = "-";

bot.commands = new Collection();

const commandFiles = fs
  .readdirSync("./commands/")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  bot.commands.set(command.name, command);
}

bot.once("ready", async () => {
  console.log("This bot is online");

  // Set bot's presence
  bot.user.setPresence({
    activities: [{ name: `for -help`, type: ActivityType.Watching }],
    status: "for -help",
  });

  console.log(bot.commands.get("spirit").name);
});

bot.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith(PREFIX)) return;

  let args = msg.content.slice(PREFIX.length).trim().split(" ");
  let command = args.shift().toLowerCase();

  if (!bot.commands.has(command)) return console.log("command not in list");

  try {
    await bot.commands.get(command).execute(msg, args, Discord);
  } catch (error) {
    console.error(error);
  }
});

bot.login();
