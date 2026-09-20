#!/usr/bin/env bash
# Обновить код и перезапустить бота. Запускать на сервере после каждого
# git push в main:
#   sudo bash /opt/smokefree/app/deploy/oracle-always-free/update.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Запусти через sudo" >&2
  exit 1
fi

APP_DIR=/opt/smokefree/app
VENV_DIR=/opt/smokefree/venv

git -C "$APP_DIR" pull --ff-only
"$VENV_DIR/bin/pip" install -r "$APP_DIR/requirements.txt"
chown -R smokefree:smokefree /opt/smokefree
systemctl restart smokefree-bot

echo "Обновлено и перезапущено. Логи: journalctl -u smokefree-bot -f"
