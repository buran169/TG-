const TelegramBot = require('node-telegram-bot-api');
const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');
const { Webhook } = require('discord-webhook-node');

const TELEGRAM_TOKEN = "8492109741:AAFShgZy_MhE6IGSGKH8PF1H6dac4KKZBgs";
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1458446450387062825/n3DWZpHq4efHLdNIZUiMyGcFj-ySQo21aule2_rteaAhh40SRn9dXt9EdJoJt2iJbBC3";

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const hook = new Webhook(DISCORD_WEBHOOK_URL);

// Google Drive Auth
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/drive']
});
const drive = google.drive({ version: 'v3', auth });

bot.on('message', async (msg) => {
  if (!msg.forward_from_chat) return;

  if (msg.video || msg.document) {
    const file = msg.video || msg.document;
    const fileId = file.file_id;
    const fileName = file.file_name || 'video.mp4';

    // Telegram file download
    const tgFile = await bot.getFile(fileId);
    const url = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${tgFile.file_path}`;

    const res = await axios({ url, method: 'GET', responseType: 'stream' });
    const path = `./${fileName}`;
    res.data.pipe(fs.createWriteStream(path));

    res.data.on('end', async () => {
      // Upload to Drive
      const uploaded = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: ['1MHd9OyPXmV4ioDHyfMdNZ5FVcLYVHjT4']
        },
        media: {
          body: fs.createReadStream(path)
        }
      });

      // Make public
      await drive.permissions.create({
        fileId: uploaded.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      const link = `https://drive.google.com/file/d/${uploaded.data.id}/view`;

      // Send to Discord
      await hook.send({
        content: `📦 **New File Uploaded**\n🔗 ${link}`
      });

      fs.unlinkSync(path);
    });
  }
});
