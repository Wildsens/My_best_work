import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const endpoint = import.meta.env.VITE_TAIL_BOT_API_URL;

export default function TailBot() {
  const telegram = window.Telegram?.WebApp;
  const initData = telegram?.initData;
  const [data, setData] = useState(null);
  const [chat, setChat] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const request = useCallback(async (action, values = {}, signal) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, initData, ...values }),
      signal,
    });
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new Error('Сервер бота недоступен.');
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Не удалось загрузить данные.');
    return result;
  }, [initData]);

  useEffect(() => {
    if (!initData || !endpoint) return;
    telegram.ready();
    const controller = new AbortController();
    request('dashboard', {}, controller.signal).then(setData).catch(err => {
      if (!controller.signal.aborted) setError(err.message);
    });
    return () => controller.abort();
  }, [initData, request, telegram]);

  async function addChat(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await request('add', { chat: chat.trim() });
      setChat('');
      setData(await request('dashboard'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="issues-page tail-panel">
      {!initData && <Link className="primary-link" to="/">← Back to tools</Link>}
      <h1 className="issues-title">Tail Bot</h1>
      {!initData && <p>Открой Mini App в Telegram, чтобы посмотреть репорты или подключить группу.</p>}
      {initData && !endpoint && <p>Mini App пока не подключена к серверу бота.</p>}
      {initData && endpoint && !data && !error && <p role="status">Загружаю данные…</p>}
      {error && <p role="alert">{error}</p>}
      {data?.isOwner && (
        <section className="issue-card">
          <h2>Мои чаты</h2>
          {data.chats.length > 0 ? (
            <ul>{data.chats.map(group => (
              <li key={group.id}>{group.title} · {group.username ? '@' + group.username : group.id}</li>
            ))}</ul>
          ) : <p>Чаты ещё не подключены.</p>}
          <form onSubmit={addChat}>
            <label className="search-label">
              Сначала добавь бота в группу
              <input value={chat} onChange={event => setChat(event.target.value)}
                placeholder="@username или ID из /chatid" maxLength={65} required />
            </label>
            <button className="primary-link" disabled={busy || !chat.trim()}>
              {busy ? 'Подключаю…' : 'Добавить чат'}
            </button>
          </form>
        </section>
      )}
      {data && (
        <section aria-labelledby="reports-title">
          <h2 id="reports-title">Репорты</h2>
          {data.reports.length ? (
            <div className="issues-grid">
              {data.reports.map(report => (
                <article className="issue-card" key={report.id}>
                  <h3>{report.title} · #{report.id}</h3>
                  <p>На участника {report.target}</p>
                  <p className="tail-report-reason">{report.reason}</p>
                  {report.link && <a href={report.link} target="_blank" rel="noreferrer">Открыть сообщение</a>}
                </article>
              ))}
            </div>
          ) : <p>Доступных репортов пока нет.</p>}
        </section>
      )}
    </main>
  );
}
