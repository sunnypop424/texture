import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search as SearchIcon } from 'lucide-react';
import { FragmentItem } from '../../components/FragmentItem';
import { useFragmentStore } from '../../lib/fragmentStore';

export function SearchPage() {
  const navigate = useNavigate();
  const fragments = useFragmentStore((s) => s.fragments);
  const [query, setQuery] = useState('');

  const trimmed = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!trimmed) return [];
    return fragments
      .filter(
        (f) =>
          f.title.toLowerCase().includes(trimmed) || f.dayDate.includes(trimmed),
      )
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  }, [fragments, trimmed]);

  return (
    <div className="stack-4">
      <header className="search-bar">
        <button className="detail-header__back" aria-label="뒤로" onClick={() => navigate(-1)}>
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <div className="search-bar__field">
          <SearchIcon size={16} strokeWidth={1.75} aria-hidden className="search-bar__icon" />
          <input
            type="text"
            className="search-bar__input"
            placeholder="결 검색 — 제목이나 날짜로"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </header>

      {!trimmed ? (
        <div className="empty">결을 검색해 보세요. 제목이나 날짜(예: 2026-05)로 찾을 수 있어요.</div>
      ) : results.length === 0 ? (
        <div className="empty">‘{query.trim()}’와 맞는 결이 없어요.</div>
      ) : (
        <section>
          <div className="section-sub" style={{ marginBottom: 'var(--space-2)' }}>
            검색 결과 {results.length}
          </div>
          <div>
            {results.map((f) => (
              <FragmentItem
                key={f.id}
                fragment={f}
                onOpen={(id) => navigate(`/fragments/${id}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
