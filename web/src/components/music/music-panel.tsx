"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { useMusicPlayer } from "@/components/music/music-provider";

const LazyVisualizer = dynamic(
  () => import("@/components/music/music-visualizer").then((module) => module.MusicVisualizer),
  { ssr: false },
);

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatBytes(bytes?: number) {
  if (!bytes || !Number.isFinite(bytes)) {
    return null;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(0.1, bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toTitleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

function pickFacetValues(values: string[], selected: string, limit: number, expanded: boolean) {
  if (expanded || values.length <= limit) {
    return values;
  }

  const next = values.slice(0, limit);

  if (selected !== "all" && !next.includes(selected) && values.includes(selected)) {
    next[next.length - 1] = selected;
  }

  return [...new Set(next)];
}

export function MusicPanel() {
  const {
    items,
    countries,
    moods,
    tags,
    catalogError,
    selectedCountry,
    selectedMood,
    selectedTag,
    currentTrack,
    currentTime,
    duration,
    isPlaying,
    isBuffering,
    isLoadingCatalog,
    autoplayBlocked,
    volume,
    focusMode,
    isExpanded,
    analyserNode,
    setCountry,
    setMood,
    setTag,
    playTrackById,
    togglePlayPause,
    playNext,
    playPrevious,
    setVolumeLevel,
    setFocusMode,
    setExpanded,
    acknowledgePlaybackIntent,
  } = useMusicPlayer();

  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllFacets, setShowAllFacets] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const temporaryExpanded = isExpanded;

  const groupedTracks = useMemo(() => {
    const groups = new Map<string, typeof items>();

    for (const track of items) {
      const key = `${track.country}:${track.mood}`;
      const list = groups.get(key) ?? [];
      list.push(track);
      groups.set(key, list);
    }

    return [...groups.entries()];
  }, [items]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredGroupedTracks = useMemo(() => {
    if (!normalizedSearch) {
      return groupedTracks;
    }

    return groupedTracks
      .map(([groupKey, groupItems]) => {
        const filteredItems = groupItems.filter((track) => {
          const haystack = [track.title, track.country, track.mood, track.tags.join(" ")].join(" ").toLowerCase();
          return haystack.includes(normalizedSearch);
        });
        return [groupKey, filteredItems] as const;
      })
      .filter(([, groupItems]) => groupItems.length > 0);
  }, [groupedTracks, normalizedSearch]);

  const filteredTracksCount = useMemo(
    () => filteredGroupedTracks.reduce((count, [, groupItems]) => count + groupItems.length, 0),
    [filteredGroupedTracks],
  );

  const visibleCountries = useMemo(
    () => pickFacetValues(countries, selectedCountry, 5, showAllFacets),
    [countries, selectedCountry, showAllFacets],
  );
  const visibleMoods = useMemo(
    () => pickFacetValues(moods, selectedMood, 5, showAllFacets),
    [moods, selectedMood, showAllFacets],
  );
  const visibleTags = useMemo(() => pickFacetValues(tags, selectedTag, 8, showAllFacets), [tags, selectedTag, showAllFacets]);
  const hiddenFacetCount = (countries.length - visibleCountries.length) + (moods.length - visibleMoods.length) + (tags.length - visibleTags.length);

  const trackTags = useMemo(() => currentTrack?.tags.slice(0, 4) ?? [], [currentTrack]);
  const fileSize = useMemo(() => formatBytes(currentTrack?.bytes), [currentTrack]);
  const statusLabel = isLoadingCatalog ? "Syncing library" : catalogError ? "Catalog unavailable" : `${items.length} tracks`;
  const statusTone = isBuffering ? "is-buffering" : isPlaying ? "is-playing" : "";
  const currentCountryLabel = currentTrack ? toTitleCase(currentTrack.country) : null;
  const currentMoodLabel = currentTrack ? toTitleCase(currentTrack.mood) : null;
  const playbackDuration = duration || currentTrack?.duration || 0;
  const playbackProgress = playbackDuration > 0 ? Math.min(100, Math.max(0, (currentTime / playbackDuration) * 100)) : 0;
  const showTopProgress = Boolean(currentTrack && !temporaryExpanded);
  const showMiniWave = temporaryExpanded;

  function onPanelKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === " ") {
      event.preventDefault();
      void togglePlayPause(true);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      void playNext();
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      void playPrevious();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setVolumeLevel(Math.min(1, volume + 0.05));
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setVolumeLevel(Math.max(0, volume - 0.05));
    }
  }

  function handleGestureStart(event: React.TouchEvent<HTMLDivElement>) {
    setTouchStartY(event.touches[0]?.clientY ?? null);
  }

  function handleGestureEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartY === null) {
      return;
    }

    const endY = event.changedTouches[0]?.clientY ?? touchStartY;
    const delta = endY - touchStartY;

    if (delta < -36) {
      setExpanded(true);
    }

    if (delta > 42) {
      setExpanded(false);
    }

    setTouchStartY(null);
  }

  const rootClassName = `music-layer-root ${isExpanded ? "is-expanded" : "is-minimized"}`;

  return (
    <div className={rootClassName}>
      <div className="music-layer-backdrop" aria-hidden="true">
        <div className="music-backdrop-gradient" />
        <div className="music-backdrop-orbit" />
        <div className="music-backdrop-shape shape-rhombus" />
        <div className="music-backdrop-shape shape-triangle" />
        <div className="music-backdrop-shape shape-pentagon" />
        <div className="music-backdrop-glow" />
      </div>
      <AnimatePresence>
        {focusMode ? (
          <motion.div
            className="focus-mode-veil"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.32 }}
            aria-hidden="true"
          />
        ) : null}
      </AnimatePresence>

      <motion.aside
        ref={panelRef}
        className={`music-panel ${temporaryExpanded ? "is-expanded" : "is-minimized"}`}
        onTouchStart={handleGestureStart}
        onTouchEnd={handleGestureEnd}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 28, scale: 0.96 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
        tabIndex={0}
        onKeyDown={onPanelKeyDown}
        role="region"
        aria-label="Global ambient music controller"
      >
        <div className="music-panel-shell">
          {temporaryExpanded ? (
            <>
              <div className="music-panel-header">
                <div className="music-panel-title">
                  <p className="music-panel-kicker">Global Music Layer</p>
                  <p className="music-panel-subtitle">Platinum-grade sonic atlas</p>
                </div>
                <div className="music-panel-status">
                  <span className={`music-status-dot ${statusTone}`} aria-hidden="true" />
                  <span className="music-status-text">{statusLabel}</span>
                </div>
              </div>

              <div className="music-panel-topbar">
                <button
                  type="button"
                  className={`music-icon-button ${isPlaying ? "is-playing" : "is-paused"}`}
                  aria-label={isPlaying ? "Pause ambient audio" : "Play ambient audio"}
                  onClick={() => void togglePlayPause(true)}
                >
                  <span className="music-icon-glyph" aria-hidden="true">
                    <span className="music-icon-glyph-play">
                      <span className="music-icon-shape-triangle" />
                    </span>
                    <span className="music-icon-glyph-pause">
                      <span className="music-icon-shape-bars" />
                    </span>
                  </span>
                </button>

                <div className="music-now-playing" aria-live="polite">
                  <p className="music-now-kicker">Global Layer</p>
                  <p className="music-now-title" title={currentTrack?.title ?? "No track selected"}>
                    {currentTrack?.title ?? "No track selected"}
                  </p>
                  <p className="music-now-meta">
                    {currentTrack && currentCountryLabel && currentMoodLabel
                      ? `${currentCountryLabel} / ${currentMoodLabel}`
                      : "Choose a category"}
                  </p>
                </div>

                <button
                  type="button"
                  className="music-icon-button"
                  aria-label={temporaryExpanded ? "Collapse player" : "Expand player"}
                  onClick={() => setExpanded(!isExpanded)}
                >
                  {temporaryExpanded ? "-" : "+"}
                </button>
              </div>
            </>
          ) : (
            <div className="music-mini-row" aria-live="polite">
              <button
                type="button"
                className={`music-icon-button ${isPlaying ? "is-playing" : "is-paused"}`}
                aria-label={isPlaying ? "Pause ambient audio" : "Play ambient audio"}
                onClick={() => void togglePlayPause(true)}
              >
                <span className="music-icon-glyph" aria-hidden="true">
                  <span className="music-icon-glyph-play">
                    <span className="music-icon-shape-triangle" />
                  </span>
                  <span className="music-icon-glyph-pause">
                    <span className="music-icon-shape-bars" />
                  </span>
                </span>
              </button>
              <p className="music-mini-title" title={currentTrack?.title ?? "No track selected"}>
                {currentTrack?.title ?? "No track selected"}
              </p>
              <button
                type="button"
                className="music-icon-button"
                aria-label="Expand player"
                onClick={() => setExpanded(true)}
              >
                +
              </button>
            </div>
          )}

          {showTopProgress ? (
            <div className="music-top-progress-wrap" aria-label="Playback progress rail">
              <div className="music-mini-wave-line" aria-hidden="true">
                <span className="music-mini-wave-star" />
                <div className="music-top-progress">
                  <span className="music-top-progress-fill" style={{ width: `${playbackProgress}%` }} />
                </div>
              </div>
              <div className="music-top-progress-time" aria-hidden="true">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(playbackDuration)}</span>
              </div>
            </div>
          ) : null}

          <AnimatePresence initial={false}>
            {temporaryExpanded ? (
              <motion.div
                key="expanded"
                className="music-expanded"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: 0.26 }}
              >
                {showMiniWave ? (
                  <div className="music-mini-wave music-mini-wave-expanded" aria-label="Now playing visualizer">
                    <LazyVisualizer analyserNode={analyserNode} active={isPlaying || isBuffering} />
                  </div>
                ) : null}

                <div className="music-expanded-top">
                  <div className="music-expanded-left">
                    <div className="music-track-focus">
                      <div className="music-track-cover">
                        {currentTrack?.coverImage ? (
                          <img src={currentTrack.coverImage} alt={currentTrack.title} loading="lazy" />
                        ) : (
                          <div className="music-cover-fallback">
                            <span>∞</span>
                            <p>Platinum glow</p>
                          </div>
                        )}
                      </div>
                      <div className="music-track-details">
                        <p className="music-track-label">Now spinning</p>
                        <p className="music-track-title" title={currentTrack?.title ?? "Pick a track"}>
                          {currentTrack?.title ?? "Pick a track"}
                        </p>
                        <p className="music-track-meta">
                          {currentTrack && currentCountryLabel && currentMoodLabel
                            ? `${currentCountryLabel} · ${currentMoodLabel}`
                            : "Awaiting selection"}
                        </p>
                        <div className="music-track-badges">
                          {currentTrack?.format ? <span className="music-badge">{currentTrack.format.toUpperCase()}</span> : null}
                          {currentTrack?.duration ? <span className="music-badge">{formatDuration(currentTrack.duration)}</span> : null}
                          {fileSize ? <span className="music-badge">{fileSize}</span> : null}
                        </div>
                      </div>
                    </div>

                    {trackTags.length ? (
                      <div className="music-track-tags">
                        {trackTags.map((tag) => (
                          <span key={tag} className="music-tag">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="music-controls-row">
                      <button type="button" className="music-soft-button" onClick={() => void playPrevious()} aria-label="Play previous track">
                        Prev
                      </button>
                      <button type="button" className="music-soft-button" onClick={() => void togglePlayPause(true)} aria-label="Toggle playback">
                        {isPlaying ? "Pause" : "Play"}
                      </button>
                      <button type="button" className="music-soft-button" onClick={() => void playNext()} aria-label="Play next track">
                        Next
                      </button>
                      <button
                        type="button"
                        className={`music-soft-button ${focusMode ? "is-focus" : ""}`}
                        onClick={() => setFocusMode(!focusMode)}
                        aria-pressed={focusMode}
                        aria-label="Toggle focus mode"
                      >
                        Focus
                      </button>
                    </div>

                    <div className="music-progress-row" aria-label="Track progress">
                      <span>{formatDuration(currentTime)}</span>
                      <div className="music-progress-track" aria-hidden="true">
                        <span className="music-progress-fill" style={{ width: `${playbackProgress}%` }} />
                      </div>
                      <span>{formatDuration(playbackDuration)}</span>
                    </div>

                    <label className="music-volume-row">
                      <span>Volume</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={(event) => setVolumeLevel(Number(event.target.value))}
                        aria-label="Volume slider"
                      />
                    </label>
                  </div>

                  <div className="music-filter-card">
                      <p className="music-filter-title">Filter catalog</p>
                      <label className="music-search-field">
                        <span className="music-search-label">Search songs</span>
                        <input
                          type="search"
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder="Title, mood, country, tags"
                          className="music-search-input"
                          aria-label="Search songs"
                        />
                      </label>
                      <div className="music-search-meta-row">
                        <span className="music-search-meta">
                          {normalizedSearch ? `${filteredTracksCount} matches` : `${items.length} available`}
                        </span>
                        <button type="button" className="music-chip music-chip-more" onClick={() => setShowAllFacets((value) => !value)}>
                          {showAllFacets ? "Compact" : `Show All${hiddenFacetCount > 0 ? ` +${hiddenFacetCount}` : ""}`}
                        </button>
                      </div>
                      <div className="music-chip-row" role="tablist" aria-label="Filter by country">
                        <button
                          type="button"
                          className={`music-chip ${selectedCountry === "all" ? "is-active" : ""}`}
                          onClick={() => setCountry("all")}
                          role="tab"
                          aria-selected={selectedCountry === "all"}
                        >
                          All countries
                        </button>
                        {visibleCountries.map((country) => (
                          <button
                            key={country}
                            type="button"
                            className={`music-chip ${selectedCountry === country ? "is-active" : ""}`}
                            onClick={() => setCountry(country)}
                            role="tab"
                            aria-selected={selectedCountry === country}
                          >
                            {toTitleCase(country)}
                          </button>
                        ))}
                      </div>

                      <div className="music-chip-row" role="tablist" aria-label="Filter by mood">
                        <button
                          type="button"
                          className={`music-chip ${selectedMood === "all" ? "is-active" : ""}`}
                          onClick={() => setMood("all")}
                          role="tab"
                          aria-selected={selectedMood === "all"}
                        >
                          All moods
                        </button>
                        {visibleMoods.map((mood) => (
                          <button
                            key={mood}
                            type="button"
                            className={`music-chip ${selectedMood === mood ? "is-active" : ""}`}
                            onClick={() => setMood(mood)}
                            role="tab"
                            aria-selected={selectedMood === mood}
                          >
                            {toTitleCase(mood)}
                          </button>
                        ))}
                      </div>

                      <div className="music-chip-row" aria-label="Filter by tags">
                        <button
                          type="button"
                          className={`music-chip ${selectedTag === "all" ? "is-active" : ""}`}
                          onClick={() => setTag("all")}
                          aria-pressed={selectedTag === "all"}
                        >
                          All tags
                        </button>
                        {visibleTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className={`music-chip ${selectedTag === tag ? "is-active" : ""}`}
                            onClick={() => setTag(tag)}
                            aria-pressed={selectedTag === tag}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                  </div>
                </div>

                <div className="music-playlist music-playlist-wide" role="list" aria-label="Ambient playlist">
                  {isLoadingCatalog ? <p className="music-empty">Loading music catalog...</p> : null}
                  {!isLoadingCatalog && catalogError ? <p className="music-empty">{catalogError}</p> : null}
                  {!isLoadingCatalog && !catalogError && !items.length ? <p className="music-empty">No tracks found for this filter.</p> : null}
                  {!isLoadingCatalog && items.length > 0 && filteredTracksCount === 0 ? <p className="music-empty">No songs match your search.</p> : null}
                  {filteredGroupedTracks.map(([groupKey, groupItems]) => (
                    <div key={groupKey} className="music-playlist-group">
                      <p className="music-playlist-group-title">
                        {toTitleCase(groupItems[0]?.country ?? "")} - {toTitleCase(groupItems[0]?.mood ?? "")}
                      </p>
                      {groupItems.map((track) => {
                        const trackDuration = track.duration > 0 ? track.duration : currentTrack?.id === track.id ? playbackDuration : 0;

                        return (
                          <button
                            key={track.id}
                            type="button"
                            className={`music-track-item ${currentTrack?.id === track.id ? "is-current" : ""}`}
                            onClick={() => void playTrackById(track.id, true)}
                            role="listitem"
                            aria-label={`Play ${track.title}`}
                              title={track.publicId}
                            >
                              <span className="music-track-item-main">
                                <span className="music-track-item-title" title={track.title}>
                                  {track.title}
                                </span>
                                <span className="music-track-item-meta">
                                {toTitleCase(track.country)} · {toTitleCase(track.mood)} · {track.format.toUpperCase()}
                              </span>
                            </span>
                            <span className="music-track-item-side">
                              <span>{formatDuration(trackDuration)}</span>
                              {track.bytes ? <span>{formatBytes(track.bytes)}</span> : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {autoplayBlocked ? (
            <button
              type="button"
              className="music-autoplay-prompt"
              onClick={() => {
                acknowledgePlaybackIntent();
                void togglePlayPause(true);
              }}
            >
              Start ambient music
            </button>
          ) : null}

          {isBuffering ? <p className="music-buffering">Buffering stream...</p> : null}
        </div>
      </motion.aside>
    </div>
  );
}
