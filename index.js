const express = require('express');
const { Client, Events } = require('@altkit/discord');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID || '701688616614625360';
const CHANNEL_ID = process.env.CHANNEL_ID || '1473480578761490636';
const PORT = process.env.PORT || 3000;

if (!TOKEN) {
  console.error('Missing TOKEN environment variable');
  process.exit(1);
}

const app = express();
app.get('/', (req, res) => res.send('ok'));
app.listen(PORT, () => console.log('web server on port', PORT));

const client = new Client();

async function connect() {
  try {
    const guild = client.guilds.cache.get(GUILD_ID) || (await client.guilds.fetch(GUILD_ID));
    const connection = joinVoiceChannel({
      channelId: CHANNEL_ID,
      guildId: GUILD_ID,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: true,
      debug: true,
    });

    connection.on('debug', m => console.log('VOICE:', m));
    connection.on('stateChange', (o, n) => console.log('STATE:', o.status, '->', n.status));
    connection.on('error', e => console.log('VOICE ERROR:', e.message));

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5000),
        ]);
      } catch {
        console.log('disconnected, rejoining');
        connection.destroy();
        setTimeout(connect, 10000);
      }
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 30000);
    console.log('JOINED VOICE CHANNEL');
  } catch (e) {
    console.log('join failed:', e.message);
    setTimeout(connect, 30000);
  }
}

client.once(Events.ClientReady, c => {
  console.log('logged in as', c.user.tag);
  connect();
});

process.on('unhandledRejection', e => console.log('error:', e && e.message ? e.message : e));

client.login(TOKEN).catch(e => {
  console.error('Login failed:', e.message);
});
