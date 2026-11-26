"""Telegram-бот «Хвост»."""

import json
import os
import random
import re
import sqlite3
import sys
import time
from contextlib import closing
from datetime import datetime
from pathlib import Path
from threading import Thread
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

# Вставь новый токен из BotFather между кавычками.
BOT_TOKEN = "8784602838:AAHxFHow9Xj9yBTtE7eF4jc17t8p1ocUwwQ"
# При необходимости укажи @username или числовой ID группы.
BOT_CHAT = "2839833200"
OWNER_ID = 1022729084  # Use /myid in a private chat with the bot.

DEFAULT_RULES = (
    "Правила чата:\n1. Уважайте участников.\n"
    "2. Без спама и оскорблений.\n3. Не публикуйте чужие личные данные."
)
HELP = (
    "🐾 /grow — вырастить хвост, /tail — длина, /top — рейтинг.\n"
    "📌 /rules — правила.\n🚩 /report причина — ответом на сообщение.\n"
    "Админам: /setrules текст в группе, /reports в личке."
)
GROUP_TYPES = {"group", "supergroup"}
COMMAND = re.compile(r"/([a-z_]+)(?:@([a-z0-9_]+))?(?:\s+([\s\S]*))?", re.I | re.ASCII)
SCHEMA = """
CREATE TABLE IF NOT EXISTS rules (chat INTEGER PRIMARY KEY, text TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tails (
    chat INTEGER, user INTEGER, name TEXT NOT NULL, length INTEGER NOT NULL,
    day TEXT NOT NULL, PRIMARY KEY (chat, user)
);
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY, chat INTEGER NOT NULL, title TEXT NOT NULL,
    message INTEGER NOT NULL, reporter INTEGER NOT NULL, target INTEGER NOT NULL,
    target_name TEXT NOT NULL, reason TEXT NOT NULL,
    UNIQUE (chat, message, reporter)
);
CREATE TABLE IF NOT EXISTS managed_chats (
    chat INTEGER PRIMARY KEY, title TEXT NOT NULL, username TEXT
);
"""


class TelegramError(RuntimeError):
    def __init__(self, method, code=None):
        self.code = code
        super().__init__(
            f"Ошибка Telegram в {method} ({code})." if code is not None
            else f"Telegram недоступен при вызове {method}."
        )


def telegram_api(token):
    def call(method, **params):
        request = Request(
            f"https://api.telegram.org/bot{token}/{method}",
            data=json.dumps(params).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=45) as response:
                payload = json.load(response)
        except HTTPError as error:
            code = error.code
            error.close()
            raise TelegramError(method, code) from None
        except (URLError, OSError, ValueError):
            raise TelegramError(method) from None
        if not payload.get("ok"):
            raise TelegramError(method, payload.get("error_code")) from None
        return payload["result"]
    return call


def name_of(user):
    return " ".join(user[key] for key in ("first_name", "last_name") if user.get(key))[:100]


def save_chat(db, chat):
    with db:
        db.execute(
            """INSERT INTO managed_chats VALUES (?, ?, ?)
               ON CONFLICT(chat) DO UPDATE SET title = excluded.title, username = excluded.username""",
            (chat["id"], chat["title"], chat.get("username")),
        )


class TailBot:
    def __init__(self, db, api, username, chat_id=None, owner_id=None, bot_id=None):
        self.db = db
        self.api = api
        self.username = username.casefold()
        self.chat_id = chat_id
        self.owner_id = owner_id
        self.bot_id = bot_id
        self.waiting_for_chat = False
        self.timezone = ZoneInfo("Europe/Kyiv")
        self.db.row_factory = sqlite3.Row
        self.db.executescript(SCHEMA)

    def handles_chat(self, chat_id):
        if self.owner_id is not None:
            return self.db.execute("SELECT 1 FROM managed_chats WHERE chat = ?", (chat_id,)).fetchone() is not None
        return self.chat_id is None or chat_id == self.chat_id

    def show_menu(self, prefix="Мои чаты"):
        self.api("sendMessage", chat_id=self.owner_id, text=prefix, reply_markup={"inline_keyboard": [[
            {"text": "Добавить чат", "callback_data": "chats:add"},
            {"text": "Список чатов", "callback_data": "chats:list"},
        ]]})

    def handle_menu_button(self, query):
        action = query.get("data")
        if action not in {"chats:add", "chats:list", "chats:cancel"}:
            return
        chat = (query.get("message") or {}).get("chat", {})
        if self.owner_id is None or query["from"]["id"] != self.owner_id or chat.get("id") != self.owner_id or chat.get("type") != "private":
            self.api("answerCallbackQuery", callback_query_id=query["id"], text="Только для владельца.")
            return
        self.api("answerCallbackQuery", callback_query_id=query["id"])
        self.waiting_for_chat = action == "chats:add"
        if action == "chats:add":
            self.api("sendMessage", chat_id=self.owner_id,
                     text="Сначала добавь бота в группу. Пришли её @username или ID из /chatid.",
                     reply_markup={"inline_keyboard": [[{"text": "Отмена", "callback_data": "chats:cancel"}]]})
        elif action == "chats:list":
            rows = self.db.execute("SELECT chat, title, username FROM managed_chats ORDER BY title, chat").fetchall()
            if not rows:
                self.show_menu("Подключённых чатов пока нет.")
                return
            for start in range(0, len(rows), 15):
                lines = []
                for row in rows[start:start + 15]:
                    username = f" · @{row['username']}" if row["username"] else ""
                    lines.append(f"{row['title']}{username}\nID: {row['chat']}")
                self.show_menu("Подключённые чаты\n\n" + "\n\n".join(lines))
        else:
            self.show_menu()

    def add_chat(self, reference):
        try:
            chat = resolve_group(self.api, self.bot_id, reference)
            save_chat(self.db, chat)
        except ValueError as error:
            self.api("sendMessage", chat_id=self.owner_id, text=str(error))
            return
        except TelegramError as error:
            if error.code not in {400, 403}:
                raise
            self.api("sendMessage", chat_id=self.owner_id, text="Telegram не нашёл группу. Проверь ID и что бот добавлен.")
            return
        self.waiting_for_chat = False
        self.show_menu(f"Группа «{chat['title']}» подключена.")

    def is_admin(self, chat_id, user_id):
        member = self.api("getChatMember", chat_id=chat_id, user_id=user_id)
        return member["status"] in {"administrator", "creator"}

    def rules_for(self, chat_id):
        result = self.db.execute("SELECT text FROM rules WHERE chat = ?", (chat_id,)).fetchone()
        return result["text"] if result else DEFAULT_RULES

    def show_reports(self, user_id, reply):
        visible = []
        for row in self.db.execute("SELECT DISTINCT chat FROM reports").fetchall():
            chat_id = row["chat"]
            if not self.handles_chat(chat_id):
                continue
            try:
                if self.is_admin(chat_id, user_id):
                    visible.append(chat_id)
            except TelegramError:
                continue
        if not visible:
            reply("Доступных репортов пока нет.")
            return
        placeholders = ", ".join("?" for _ in visible)
        reports = self.db.execute(
            f"SELECT * FROM reports WHERE chat IN ({placeholders}) ORDER BY id DESC LIMIT 10",
            visible,
        ).fetchall()
        for item in reports:
            chat = str(item["chat"])
            message = item["message"]
            reference = f"https://t.me/c/{chat[4:]}/{message}" if chat.startswith("-100") else f"сообщение №{message}"
            reply(
                f"Репорт №{item['id']} · {item['title']}\n"
                f"На: {item['target_name']} (ID {item['target']})\n"
                f"Причина: {item['reason']}\n{reference}"
            )

    def handle(self, update):
        if update.get("callback_query"):
            self.handle_menu_button(update["callback_query"])
            return
        msg = update.get("message")
        if not msg:
            return
        chat = msg["chat"]
        chat_id = chat["id"]
        group = chat["type"] in GROUP_TYPES
        def reply(text, **extra):
            params = {"chat_id": chat_id, "text": text, **extra}
            if msg.get("is_topic_message") and msg.get("message_thread_id") is not None:
                params["message_thread_id"] = msg["message_thread_id"]
            self.api("sendMessage", **params)

        text = msg.get("text", "")
        match = COMMAND.fullmatch(text)
        sender = msg.get("from")
        addressed = match and sender and (not match[2] or match[2].casefold() == self.username)
        owner_private = self.owner_id is not None and chat["type"] == "private" and chat_id == self.owner_id and sender and sender["id"] == self.owner_id
        if owner_private and self.waiting_for_chat and text and not text.startswith("/"):
            self.add_chat(text.strip())
            return
        if addressed and group and match[1].lower() == "chatid" and not msg.get("sender_chat"):
            reply(f"ID этой группы: {chat_id}")
            return
        if group and not self.handles_chat(chat_id):
            return

        newcomers = [user for user in msg.get("new_chat_members", []) if not user.get("is_bot")]
        if group and newcomers:
            names = ", ".join(map(name_of, newcomers))[:1000]
            reply(f"Привет, {names}! Добро пожаловать 👋\n\n{self.rules_for(chat_id)}")

        if not addressed:
            return
        command, _, argument = match.groups()
        command = command.lower()
        arg = (argument or "").strip()
        user_id = sender["id"]

        if chat["type"] == "private" and command == "myid":
            reply(f"Твой Telegram ID: {user_id}")
            return
        if owner_private and command in {"start", "menu"}:
            self.waiting_for_chat = False
            self.show_menu(HELP if command == "start" else "Мои чаты")
            return
        if command in {"start", "help"}:
            reply(HELP)
            return
        if not group:
            if command == "reports" and chat["type"] == "private":
                self.show_reports(user_id, reply)
            return

        if command == "rules":
            reply(self.rules_for(chat_id))
        elif command == "setrules":
            if msg.get("sender_chat") or not self.is_admin(chat_id, user_id):
                reply("Менять правила может администратор от своего имени.")
                return
            if not arg or len(arg) > 2500:
                reply("Напиши /setrules и текст правил до 2500 символов.")
                return
            with self.db:
                self.db.execute(
                    "INSERT INTO rules VALUES (?, ?) ON CONFLICT(chat) DO UPDATE SET text = excluded.text",
                    (chat_id, arg),
                )
            reply("Правила сохранены.")
        elif command == "grow":
            if msg.get("sender_chat"):
                reply("Играть можно от своего имени.")
                return
            day = datetime.now(self.timezone).date().isoformat()
            amount = random.randint(1, 10)
            with self.db:
                result = self.db.execute(
                    """
                    INSERT INTO tails VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(chat, user) DO UPDATE SET name = excluded.name,
                        length = tails.length + excluded.length, day = excluded.day
                    WHERE tails.day != excluded.day
                    RETURNING length
                    """,
                    (chat_id, user_id, name_of(sender), amount, day),
                ).fetchone()
            reply(f"🐾 Хвост вырос на {amount} см! Теперь {result['length']} см." if result
                  else "Сегодня хвост уже вырос. Возвращайся завтра!")
        elif command == "tail":
            tail = self.db.execute(
                "SELECT length FROM tails WHERE chat = ? AND user = ?", (chat_id, user_id)
            ).fetchone()
            reply(f"Твой хвост — {tail['length']} см 🐾" if tail else "Начни с /grow.")
        elif command == "top":
            leaders = self.db.execute(
                "SELECT name, length FROM tails WHERE chat = ? ORDER BY length DESC, user LIMIT 10",
                (chat_id,),
            ).fetchall()
            lines = [f"{index}. {row['name']} — {row['length']} см" for index, row in enumerate(leaders, 1)]
            reply("\n".join(lines) if lines else "Пока никто не отрастил хвост.")
        elif command == "report":
            original = msg.get("reply_to_message") or {}
            target = original.get("from")
            if (not target or original.get("sender_chat") or target.get("is_bot")
                    or target["id"] == user_id or msg.get("sender_chat") or not 1 <= len(arg) <= 500):
                reply("Ответь на сообщение другого участника командой /report и укажи причину до 500 символов.")
                return
            with self.db:
                saved = self.db.execute(
                    """
                    INSERT INTO reports (chat, title, message, reporter, target, target_name, reason)
                    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(chat, message, reporter) DO NOTHING
                    """,
                    (chat_id, chat.get("title", str(chat_id)), original["message_id"],
                     user_id, target["id"], name_of(target), arg),
                ).rowcount
            reply("Репорт сохранён. Админы могут открыть его через /reports в личке с ботом."
                  if saved else "Ты уже отправил репорт на это сообщение.")
        elif command == "reports":
            reply("Администраторы могут открыть репорты командой /reports в личке с ботом.")


def resolve_group(api, bot_id, ref):
    def resolve(key):
        group = api("getChat", chat_id=key)
        if group["type"] not in GROUP_TYPES:
            raise ValueError("Укажи группу или супергруппу.")
        member = api("getChatMember", chat_id=group["id"], user_id=bot_id)
        if member["status"] in {"left", "kicked"} or member.get("is_member") is False:
            raise ValueError("Сначала добавь бота в эту группу.")
        return group

    if re.fullmatch(r"@[A-Za-z0-9_]{1,64}", ref):
        return resolve(ref)
    if re.fullmatch(r"-[1-9][0-9]{0,15}", ref) and abs(int(ref)) < 2**52:
        return resolve(int(ref))
    if re.fullmatch(r"[1-9][0-9]{0,12}", ref):
        matches = []
        for candidate in (-int(ref), -int(f"100{ref}")):
            try:
                matches.append(resolve(candidate))
            except ValueError:
                continue
            except TelegramError as error:
                if error.code not in {400, 403}:
                    raise
        if len(matches) == 1:
            return matches[0]
        raise ValueError("Не удалось однозначно найти группу. Укажи её @username или полный ID из /chatid.")
    raise ValueError("Введи @username группы или её числовой ID.")


def run():
    token = (os.environ.get("BOT_TOKEN") or BOT_TOKEN).strip()
    if not re.fullmatch(r"\d+:[A-Za-z0-9_-]+", token):
        raise RuntimeError("Укажи действующий токен в строке BOT_TOKEN в начале файла.")
    if sqlite3.sqlite_version_info < (3, 35):
        raise RuntimeError("Для запуска нужна SQLite 3.35 или новее в сборке Python.")
    api = telegram_api(token)
    me = api("getMe")
    chat_ref = (os.environ.get("BOT_CHAT") or BOT_CHAT).strip()
    target = resolve_group(api, me["id"], chat_ref) if chat_ref else None

    owner_id = int(os.environ.get("OWNER_ID") or OWNER_ID)
    if not 0 <= owner_id < 2**52:
        raise ValueError("Укажи в OWNER_ID свой числовой Telegram ID из команды /myid.")

    commands = {
        "help": "Команды бота", "rules": "Правила чата", "grow": "Вырастить хвост",
        "tail": "Мой хвост", "top": "Рейтинг хвостов", "report": "Жалоба ответом на сообщение",
    }
    api("setMyCommands", commands=[{"command": key, "description": value} for key, value in commands.items()])
    db_path = Path(__file__).resolve().with_name("tail-bot.sqlite")
    with closing(sqlite3.connect(db_path)) as db:
        bot = TailBot(db, api, me["username"], target["id"] if target else None, owner_id or None, me["id"])
        if owner_id:
            if target:
                save_chat(db, target)
            button_type = "default" if os.environ.get("MINI_APP_PORT") else "commands"
            api("setChatMenuButton", chat_id=owner_id, menu_button={"type": button_type})
            api("setMyCommands", scope={"type": "chat", "chat_id": owner_id},
                commands=[{"command": "menu", "description": "Мои чаты"},
                          {"command": "help", "description": "Команды бота"},
                          {"command": "myid", "description": "Мой Telegram ID"}])
        if os.environ.get("MINI_APP_PORT"):
            from mini_app import make_server

            site_origin = os.environ.get("MINI_APP_ORIGIN", "https://wildsens.github.io")
            server = make_server(
                int(os.environ["MINI_APP_PORT"]), site_origin, db_path, token,
                owner_id, target["id"] if target else None, api,
                lambda database, ref: save_chat(database, resolve_group(api, me["id"], ref)),
                TelegramError,
            )
            Thread(target=server.serve_forever, daemon=True).start()
            print(f"Mini App API: http://127.0.0.1:{server.server_port}/tail-api", flush=True)
        group_label = f" в группе «{target['title']}»" if target and not owner_id else ""
        print(f"Бот @{me['username']} запущен{group_label}.", flush=True)
        offset = 0
        while True:
            try:
                updates = api("getUpdates", offset=offset, timeout=30, allowed_updates=["message", "callback_query"])
            except TelegramError as error:
                if error.code == 409:
                    raise RuntimeError("У этого бота уже работает другая копия или настроен вебхук.") from None
                if error.code == 401:
                    raise
                print(error, file=sys.stderr, flush=True)
                time.sleep(3)
                continue
            for update in updates:
                try:
                    bot.handle(update)
                except (TelegramError, sqlite3.Error) as error:
                    print(f"Ошибка обработки сообщения: {error}", file=sys.stderr, flush=True)
                offset = update["update_id"] + 1


if __name__ == "__main__":
    try:
        run()
    except KeyboardInterrupt:
        print("\nБот остановлен.")
    except ZoneInfoNotFoundError:
        sys.exit("На сервере нет часового пояса Europe/Kyiv. Установи или обнови системный пакет tzdata.")
    except (RuntimeError, ValueError, OSError, sqlite3.Error) as error:
        sys.exit(str(error))
