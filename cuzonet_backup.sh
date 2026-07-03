#!/bin/bash
DATE=$(date +%F)
TMP_DIR="/root/backup_tmp_$DATE"
FINAL_FILE="/root/cuzonet_backup_$DATE.tar.gz"
TELEGRAM_BOT_TOKEN="7845808219:AAHt310HRkPi7RmIJ-Vzk8vePQsip1wq3Ss"
TELEGRAM_CHAT_ID="6580708252"

mkdir -p "$TMP_DIR"

echo "Backing up Hotspot DB..."
docker exec hotspot_db pg_dump -U hotspot_user -d hotspot_db > "$TMP_DIR/hotspot_db.sql"

echo "Backing up UISP/UNMS..."
/home/unms/app/unms-cli create-backup
LATEST_UNMS=$(ls -t /home/unms/data/unms-backups/*.tar* 2>/dev/null | head -1)
if [ ! -z "$LATEST_UNMS" ]; then
  cp "$LATEST_UNMS" "$TMP_DIR/"
fi

echo "Collecting Omada Backup..."
LATEST_OMADA=$(ls -t /home/omadabackup/*.cfg /home/omadabackup/*.zip /home/omadabackup/*.tar.gz 2>/dev/null | head -1)
if [ ! -z "$LATEST_OMADA" ]; then
  cp "$LATEST_OMADA" "$TMP_DIR/"
fi

echo "Compressing all backups..."
tar -czvf "$FINAL_FILE" -C "$TMP_DIR" .

echo "Sending to Telegram..."
curl -F document=@"$FINAL_FILE" "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendDocument?chat_id=$TELEGRAM_CHAT_ID&caption=Cuzonet+Backup+$DATE"

echo "Cleaning up..."
rm -rf "$TMP_DIR"
find /root/ -name "cuzonet_backup_*.tar.gz" -type f -mtime +7 -delete
echo "Done!"
