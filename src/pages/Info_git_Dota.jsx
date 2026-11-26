
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import "/src/style.css";

const telegram = window.Telegram?.WebApp;
const isTelegram = Boolean(telegram?.initData || (telegram?.platform && telegram.platform !== "unknown"));

function getImages(body = "") {
    const markdown = [
        ...body.matchAll(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g)
    ].map(match => match[1]);

    const html = [
        ...body.matchAll(/<img\b[^>]*src=["'](https?:\/\/[^"']+)["']/gi)
    ].map(match => match[1]);

    return [...new Set([...markdown, ...html])];
}

const API =
    "https://api.github.com/repos/ValveSoftware/Dota2-Gameplay/issues";

function IssueCard({ issue }) {
    const [expanded, setExpanded] = useState(false);

    const description = issue.body || "No description provided.";
    const images = getImages(description);
    const text = description
        .replace(/<img\b[^>]*>|!\[[^\]]*\]\([^)]+\)/gi, "")
        .replace(/^#{1,6}\s+.*$/gm, "")
        .replace(/\s+/g, " ").trim();
    function openOriginal(event) {
        if (isTelegram && telegram.openLink && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
            event.preventDefault();
            telegram.openLink(issue.html_url);
        }
    }

    return (
        <article className={expanded ? "issue-card issue-card--expanded" : "issue-card"}>

            <div className="issue-header">
                <span className={`issue-status ${issue.state}`}>
                    ● {issue.state.toUpperCase()}
                </span>

                <span className="issue-number">
                    #{issue.number}
                </span>
            </div>

            <h2>{issue.title}</h2>
            {!expanded && images.length > 0 && (
                <button className="issue-image-preview" onClick={() => setExpanded(true)}
                    aria-label={'Show attachments for ' + issue.title}>
                    <img src={images[0]} alt="" loading="lazy" />
                    {images.length > 1 && <span className="issue-image-count">+{images.length - 1}</span>}
                </button>
            )}
            <div className={`issue-description ${expanded ? "expanded" : ""}`}>
                {expanded ? (
                    <>
                        <ReactMarkdown skipHtml components={{ img: () => null }}>
                            {description}
                        </ReactMarkdown>
                        {images.map(url => <img className="attachment" key={url} src={url}
                            alt="Screenshot attached to the issue" loading="lazy" />)}
                    </>
                ) : (
                    <p>{text.length > 180 ? text.slice(0, 180).trimEnd() + "…" : text || (images.length ? "See attached screenshots." : "See full report.")}</p>
                )}
            </div>

            <div className="issue-labels">
                {issue.labels.map(label => (
                    <span key={label.id}>
                        {label.name}
                    </span>
                ))}
            </div>

            <div className="issue-meta">
                <span>💬 {issue.comments}</span>

                <span>
                    {new Date(issue.created_at).toLocaleDateString()}
                </span>
            </div>

            <div className="issue-actions">
                <button
                    className="issue-info-btn"
                    aria-expanded={expanded}
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? "Hide info" : "Full info"}
                </button>

                <a href={issue.html_url} target="_blank" rel="noopener noreferrer"
                    className="issue-original-btn"
                    onClick={openOriginal}
                >
                    View on GitHub
                </a>
            </div>

        </article>
    );
}

export default function Issues() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [query, setQuery] = useState("");
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (isTelegram) {
            telegram.ready();
            telegram.expand();
        }
    }, []);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        async function loadIssues() {
            setLoading(true);
            setError("");

            try {
                const response = await fetch(
                    `${API}?state=all&sort=created&direction=desc&per_page=20&page=${page}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error(`GitHub error: ${response.status}`);
                }

                const data = await response.json();

                if (controller.signal.aborted) return;
                setHasMore(
                    response.headers.get("Link")?.includes('rel="next"') || false
                );

                setIssues(previous => {
                    const combined = [
                        ...(page === 1 ? [] : previous),
                        ...data.filter(issue => !issue.pull_request)
                    ];

                    return [...new Map(
                        combined.map(issue => [issue.id, issue])
                    ).values()];
                });

            } catch (error) {
                if (error.name !== "AbortError") {
                    setError("Couldn’t load reports from GitHub. Please try again.");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadIssues();

        return () => controller.abort();
    }, [page, attempt]);

    const search = query.trim().toLowerCase();
    const visibleIssues = issues.filter(issue =>
        [issue.title, issue.body, '#' + issue.number, ...issue.labels.map(label => label.name)]
            .some(value => value?.toLowerCase().includes(search))
    );

    return (
        <main className="issues-page">
            <header className="tracker-head">
                {!isTelegram && (
                    <Link className="back-link" to="/" aria-label="Back to Wildsen home">
                        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
                            fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="m14 6-6 6 6 6" />
                        </svg>
                        WILDSEN
                    </Link>
                )}
                <h1 className="issues-title">Dota 2 bug tracker</h1>
                <label className="search-label">
                    Search loaded reports
                    <input type="search" placeholder="Title, issue number or label" value={query}
                        onChange={event => setQuery(event.target.value)} />
                </label>
            </header>
            {!loading && !error && !visibleIssues.length && (
                <p className="issues-message" role="status">
                    {search ? "No matching reports on the loaded pages." : "No reports on this page."}
                </p>
            )}
            <div className="issues-grid">
                {visibleIssues.map(issue => (
                    <IssueCard key={issue.id} issue={issue} />
                ))}
            </div>

            {loading && (
                <p className="issues-message">Loading issues...</p>
            )}

            {error && (
                <div className="issues-message" role="status">
                    <p>{error}</p>
                    <button className="issues-load-more" onClick={() => setAttempt(value => value + 1)}>Retry</button>
                </div>
            )}

            {!loading && !error && hasMore && (
                <button
                    className="issues-load-more"
                    onClick={() => setPage(page + 1)}
                >
                    Load more
                </button>
            )}
        </main>
    );
}
