#!/usr/bin/env bash
# ============================================================================
# SmokeFree Companion — установка на чистую Ubuntu 24.04 (Oracle Cloud Always
# Free VM, или любой другой Ubuntu-сервер с публичным IP).
#
# Запускать на самом сервере, от root (или через sudo):
#   curl -fsSL https://raw.githubusercontent.com/<user>/<repo>/main/deploy/oracle-always-free/setup.sh -o setup.sh
#   sudo bash setup.sh
#
# Скрипт интерактивно спросит токены и ссылку на базу данных — их можно
# заранее подготовить (см. deploy/oracle-always-free/README.md), либо
# передать через переменные окружения, чтобы пропустить вопросы:
#   BOT_TOKEN=... GEMINI_API_KEY=... DATABASE_URL=... REPO_URL=... sudo -E bash setup.sh
# ============================================================================
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Запусти через sudo: sudo bash setup.sh" >&2
  exit 1
fi

APP_DIR=/opt/smokefree/app
VENV_DIR=/opt/smokefree/venv
ENV_FILE=/opt/smokefree/app.env
SERVICE_NAME=smokefree-bot
SYSTEM_USER=smokefree

REPO_URL="${REPO_URL:-https://github.com/maskevichast-source/SmokeFree-Companion.git}"

echo "=============================================================="
echo " 1/8  Обновление пакетов и установка зависимостей"
echo "=============================================================="
apt-get update -y
apt-get upgrade -y
apt-get install -y python3 python3-venv python3-pip git curl ufw \
  debian-keyring debian-archive-keyring apt-transport-https gnupg \
  iptables-persistent

echo "=============================================================="
echo " 2/8  Установка Caddy (автоматический HTTPS)"
echo "=============================================================="
if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

echo "=============================================================="
echo " 3/8  Настройка файрвола (ufw + iptables Oracle-по-умолчанию)"
echo "=============================================================="
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true

# Образы Ubuntu в Oracle Cloud дополнительно ставят свои iptables-правила,
# которые блокируют 80/443 ещё ДО того, как их увидит ufw — классическая
# засада именно на Oracle. Добавляем явный ACCEPT перед общим REJECT.
for PORT in 80 443; do
  iptables -C INPUT -p tcp --dport "$PORT" -j ACCEPT 2>/dev/null || \
    iptables -I INPUT -p tcp --dport "$PORT" -j ACCEPT
done
netfilter-persistent save || true

echo "=============================================================="
echo " 4/8  Системный пользователь и каталоги"
echo "=============================================================="
id -u "$SYSTEM_USER" &>/dev/null || useradd --system --create-home --shell /usr/sbin/nologin "$SYSTEM_USER"
mkdir -p /opt/smokefree
mkdir -p /var/log/caddy

echo "=============================================================="
echo " 5/8  Код приложения"
echo "=============================================================="
if [[ -d "$APP_DIR/.git" ]]; then
  echo "Репозиторий уже есть — обновляю (git pull)"
  git -C "$APP_DIR" pull --ff-only
else
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

echo "=============================================================="
echo " 6/8  Python-окружение"
echo "=============================================================="
python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install -r "$APP_DIR/requirements.txt"

echo "=============================================================="
echo " 7/8  Секреты и конфигурация (.env)"
echo "=============================================================="
if [[ -z "${BOT_TOKEN:-}" ]]; then
  read -rp "BOT_TOKEN (от @BotFather): " BOT_TOKEN
fi
if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  read -rp "GEMINI_API_KEY: " GEMINI_API_KEY
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL — строка подключения Neon (пример:"
  echo "  postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require )"
  read -rp "DATABASE_URL: " DATABASE_URL
fi

PUBLIC_IP="$(curl -fsSL https://icanhazip.com | tr -d '[:space:]')"
DASHED_IP="${PUBLIC_IP//./-}"
DOMAIN="${DOMAIN:-${DASHED_IP}.sslip.io}"
PORT="${PORT:-8080}"

cat > "$ENV_FILE" <<EOF
BOT_TOKEN=${BOT_TOKEN}
GEMINI_API_KEY=${GEMINI_API_KEY}
DATABASE_URL=${DATABASE_URL}
WEBAPP_URL=https://${DOMAIN}
PORT=${PORT}
TIMEZONE=${TIMEZONE:-Asia/Almaty}
DEFAULT_CITY=${DEFAULT_CITY:-Астана}
LOG_LEVEL=INFO
EOF
chmod 600 "$ENV_FILE"
chown -R "$SYSTEM_USER:$SYSTEM_USER" /opt/smokefree

echo "=============================================================="
echo " 8/8  Служба systemd + Caddy"
echo "=============================================================="
cp "$APP_DIR/deploy/oracle-always-free/smokefree-bot.service" "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

sed -e "s/__DOMAIN__/${DOMAIN}/" -e "s/__PORT__/${PORT}/" \
  "$APP_DIR/deploy/oracle-always-free/Caddyfile.template" > /etc/caddy/Caddyfile
systemctl enable caddy
systemctl restart caddy

echo ""
echo "=============================================================="
echo " Готово"
echo "=============================================================="
echo "Mini App / вебхук доступен по адресу:  https://${DOMAIN}"
echo ""
echo "Проверить статус бота:   systemctl status ${SERVICE_NAME}"
echo "Смотреть логи бота:      journalctl -u ${SERVICE_NAME} -f"
echo "Смотреть логи Caddy:     journalctl -u caddy -f"
echo ""
echo "Не забудь:"
echo "  1) Остановить старый деплой на Railway (иначе два поллера будут"
echo "     конфликтовать за один BOT_TOKEN)."
echo "  2) Если используешь кнопку меню в @BotFather — обновить ссылку"
echo "     Mini App на https://${DOMAIN}"
echo "=============================================================="
