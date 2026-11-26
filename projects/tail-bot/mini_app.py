"""Owner and group administrator API for the Tail Bot Mini App."""

import hmac
import json
import re
import sqlite3
import time
from contextlib import closing
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qsl


def telegram_user(raw, token, now):
    try:
        pairs = parse_qsl(raw, strict_parsing=True, keep_blank_values=True, max_num_fields=32)
        fields = dict(pairs)
        if len(fields) != len(pairs):
            return None
        supplied = fields.pop("hash")
        if not re.fullmatch(r"[0-9a-f]{64}", supplied):
            return None
        message = "\n".join(f"{key}={value}" for key, value in sorted(fields.items())).encode()
        key = hmac.digest(b"WebAppData", token.encode(), "sha256")
        if not hmac.compare_digest(supplied, hmac.digest(key, message, "sha256").hex()):
            return None
        if not -30 <= now - int(fields["auth_date"]) <= 900:
            return None
        user_id = json.loads(fields["user"])["id"]
        return user_id if type(user_id) is int and 0 < user_id < 2**52 else None
    except (ValueError, TypeError, KeyError):
        return None


def dashboard(db, api, user_id, owner_id, group_id, telegram_error):
    if owner_id:
        chats = db.execute("SELECT chat, title, username FROM managed_chats ORDER BY title, chat").fetchall()
        report_chats = db.execute(
            "SELECT DISTINCT r.chat FROM reports r JOIN managed_chats m ON m.chat = r.chat"
        ).fetchall()
    else:
        chats = []
        report_chats = db.execute(
            "SELECT DISTINCT chat FROM reports WHERE ? IS NULL OR chat = ?", (group_id, group_id)
        ).fetchall()
    allowed = []
    for (chat_id,) in report_chats:
        try:
            member = api("getChatMember", chat_id=chat_id, user_id=user_id)
        except telegram_error:
            continue
        if member["status"] in {"creator", "administrator"}:
            allowed.append(chat_id)
    reports = []
    if allowed:
        placeholders = ",".join("?" for _ in allowed)
        for row in db.execute(
            f"SELECT id, chat, title, message, target_name, reason FROM reports "
            f"WHERE chat IN ({placeholders}) ORDER BY id DESC LIMIT 30", allowed,
        ):
            report_id, chat, title, message, name, reason = row
            private_id = re.fullmatch(r"-100(\d+)", str(chat))
            reports.append({
                "id": report_id, "title": title, "target": name, "reason": reason,
                "link": f"https://t.me/c/{private_id[1]}/{message}" if private_id else None,
            })
    return {
        "isOwner": bool(owner_id and user_id == owner_id),
        "chats": [{"id": str(chat), "title": title, "username": username}
                  for chat, title, username in chats] if owner_id and user_id == owner_id else [],
        "reports": reports,
    }


def make_server(port, origin, db_path, token, owner_id, group_id, api, add_group, telegram_error):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, format, *args):
            pass

        def respond(self, status, body=None):
            raw = json.dumps(body, ensure_ascii=False).encode() if body is not None else b""
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Vary", "Origin")
            if self.headers.get("Origin") == origin:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
            if raw:
                self.wfile.write(raw)

        def do_OPTIONS(self):
            self.respond(204 if self.headers.get("Origin") == origin and self.path == "/tail-api" else 403)

        def do_POST(self):
            if self.path != "/tail-api" or self.headers.get("Origin") != origin:
                self.respond(403, {"error": "Недопустимый адрес запроса."})
                return
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 16384 or self.headers.get_content_type() != "application/json":
                    raise ValueError
                self.connection.settimeout(10)
                body = json.loads(self.rfile.read(size))
                if not isinstance(body, dict) or not isinstance(body.get("initData"), str):
                    raise ValueError
            except (ValueError, OSError):
                self.respond(400, {"error": "Некорректный запрос."})
                return
            user_id = telegram_user(body["initData"], token, time.time())
            if user_id is None:
                self.respond(401, {"error": "Сессия Telegram недействительна или истекла. Открой Mini App заново."})
                return
            action = body.get("action")
            if action == "add" and (not owner_id or user_id != owner_id):
                self.respond(403, {"error": "Добавлять группы может только владелец бота."})
                return
            try:
                with closing(sqlite3.connect(db_path)) as db:
                    if action == "add":
                        reference = body.get("chat")
                        if not isinstance(reference, str) or len(reference) > 65:
                            raise ValueError("Укажи @username или ID группы.")
                        add_group(db, reference.strip())
                        self.respond(200, {"added": True})
                    elif action == "dashboard":
                        self.respond(200, dashboard(db, api, user_id, owner_id, group_id, telegram_error))
                    else:
                        raise ValueError("Неизвестное действие.")
            except ValueError as error:
                self.respond(400, {"error": str(error)})
            except telegram_error as error:
                status = 400 if error.code in {400, 403} else 502
                self.respond(status, {"error": "Telegram не подтвердил группу. Проверь ID и что бот добавлен."})
            except sqlite3.Error:
                self.respond(503, {"error": "Хранилище временно недоступно."})

    return ThreadingHTTPServer(("127.0.0.1", port), Handler)
