"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { MusicCatalog, MusicTrack } from "@/types/music";
import { MusicPanel } from "@/components/music/music-panel";

const PLAYER_PREFS_KEY = "hob2log-music-prefs";

type FilterValue = "all" | string;

interface PlayerPrefs {
  country: FilterValue;
  mood: FilterValue;
  tag: FilterValue;
  trackId: string | null;
  volume: number;
  focusMode: boolean;
  panelPosition: { x: number; y: number };
  expanded: boolean;
  panelVisible: boolean;
  autoplay: boolean;
}

interface MusicContextValue {
  items: MusicTrack[];
  countries: string[];
  moods: string[];
  tags: string[];
  catalogError: string | null;
  selectedCountry: FilterValue;
  selectedMood: FilterValue;
  selectedTag: FilterValue;
  currentTrack: MusicTrack | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isBuffering: boolean;
  isLoadingCatalog: boolean;
  hasPlaybackPermission: boolean;
  autoplayBlocked: boolean;
  volume: number;
  focusMode: boolean;
  isExpanded: boolean;
  isPanelVisible: boolean;
  panelPosition: { x: number; y: number };
  analyserNode: AnalyserNode | null;
  setCountry: (value: FilterValue) => void;
  setMood: (value: FilterValue) => void;
  setTag: (value: FilterValue) => void;
  playTrackById: (trackId: string, userInitiated?: boolean) => Promise<void>;
  togglePlayPause: (userInitiated?: boolean) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  setVolumeLevel: (nextVolume: number) => void;
  setFocusMode: (enabled: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  setPanelVisible: (visible: boolean) => void;
  togglePanelVisible: () => void;
  setPanelPosition: (value: { x: number; y: number }) => void;
  acknowledgePlaybackIntent: () => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

function clampVolume(value: number) {
  return Math.max(0, Math.min(1, value));
}

function readPrefs(): PlayerPrefs {
  if (typeof window === "undefined") {
    return {
      country: "all",
      mood: "all",
      tag: "all",
      trackId: null,
      volume: 0.68,
      focusMode: false,
      panelPosition: { x: 0, y: 0 },
      expanded: false,
      panelVisible: false,
      autoplay: false,
    };
  }

  try {
    const raw = localStorage.getItem(PLAYER_PREFS_KEY);

    if (!raw) {
      return {
        country: "all",
        mood: "all",
        tag: "all",
        trackId: null,
        volume: 0.68,
        focusMode: false,
        panelPosition: { x: 0, y: 0 },
        expanded: false,
        panelVisible: false,
        autoplay: false,
      };
    }

    const parsed = JSON.parse(raw) as Partial<PlayerPrefs>;

    return {
      country: parsed.country ?? "all",
      mood: parsed.mood ?? "all",
      tag: parsed.tag ?? "all",
      trackId: parsed.trackId ?? null,
      volume: clampVolume(parsed.volume ?? 0.68),
      focusMode: Boolean(parsed.focusMode),
      panelPosition: parsed.panelPosition ?? { x: 0, y: 0 },
      expanded: Boolean(parsed.expanded),
      panelVisible: Boolean(parsed.panelVisible),
      autoplay: Boolean(parsed.autoplay),
    };
  } catch {
    return {
      country: "all",
      mood: "all",
      tag: "all",
      trackId: null,
      volume: 0.68,
      focusMode: false,
      panelPosition: { x: 0, y: 0 },
      expanded: false,
      panelVisible: false,
      autoplay: false,
    };
  }
}

const DEFAULT_PREFS: PlayerPrefs = {
  country: "all",
  mood: "all",
  tag: "all",
  trackId: null,
  volume: 0.68,
  focusMode: false,
  panelPosition: { x: 0, y: 0 },
  expanded: false,
  panelVisible: false,
  autoplay: false,
};

let cachedPrefs: PlayerPrefs = DEFAULT_PREFS;

if (typeof window !== "undefined") {
  cachedPrefs = readPrefs();
}

const prefsStore = {
  listeners: new Set<() => void>(),
  emit() {
    for (const listener of this.listeners) {
      listener();
    }
  },
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },
  getSnapshot() {
    return cachedPrefs;
  },
  getServerSnapshot() {
    return DEFAULT_PREFS;
  },
};

function writePrefs(nextPrefs: PlayerPrefs) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(PLAYER_PREFS_KEY, JSON.stringify(nextPrefs));
}

async function fetchCatalog(filters: { country?: FilterValue; mood?: FilterValue; tag?: FilterValue }) {
  const params = new URLSearchParams();

  if (filters.country && filters.country !== "all") {
    params.set("country", filters.country);
  }

  if (filters.mood && filters.mood !== "all") {
    params.set("mood", filters.mood);
  }

  if (filters.tag && filters.tag !== "all") {
    params.set("tag", filters.tag);
  }

  const response = await fetch(`/api/musics${params.size ? `?${params.toString()}` : ""}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    let details = "";

    try {
      const payload = (await response.json()) as { error?: string };
      details = payload.error ? ` - ${payload.error}` : "";
    } catch {
      // ignore malformed error payloads
    }

    throw new Error(`Music catalog request failed: ${response.status}${details}`);
  }

  return (await response.json()) as MusicCatalog;
}

const clientStore = {
  subscribe() {
    return () => {};
  },
  getSnapshot() {
    return true;
  },
  getServerSnapshot() {
    return false;
  },
};

export function MusicProvider({ children }: { children: ReactNode }) {
  const prefs = useSyncExternalStore(prefsStore.subscribe.bind(prefsStore), prefsStore.getSnapshot, prefsStore.getServerSnapshot);
  const isClient = useSyncExternalStore(clientStore.subscribe, clientStore.getSnapshot, clientStore.getServerSnapshot);
  const [items, setItems] = useState<MusicTrack[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(prefs.trackId);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [hasPlaybackPermission, setHasPlaybackPermission] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextTrackRef = useRef<() => Promise<void>>(async () => {});

  const currentTrack = useMemo(() => {
    if (!currentTrackId) {
      return null;
    }

    return items.find((track) => track.id === currentTrackId) ?? null;
  }, [items, currentTrackId]);

  const persistPrefs = useCallback((updater: (prev: PlayerPrefs) => PlayerPrefs) => {
    const next = updater(prefsStore.getSnapshot());
    writePrefs(next);
    cachedPrefs = next;
    prefsStore.emit();
  }, []);

  const ensureAudioGraph = useCallback(async () => {
    const audio = audioRef.current;

    if (!audio || typeof window === "undefined") {
      return;
    }

    if (!audioContextRef.current) {
      const context = new window.AudioContext();
      const sourceNode = context.createMediaElementSource(audio);
      const gainNode = context.createGain();
      const analyser = context.createAnalyser();

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.58;

      sourceNode.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(context.destination);

      sourceNodeRef.current = sourceNode;
      gainNodeRef.current = gainNode;
      analyserRef.current = analyser;
      audioContextRef.current = context;
      setAnalyserNode(analyser);
    }

    if (audioContextRef.current?.state === "suspended") {
      await audioContextRef.current.resume();
    }
  }, []);

  const fadeGain = useCallback((target: number, durationMs: number) => {
    const gainNode = gainNodeRef.current;

    if (!gainNode || !audioContextRef.current) {
      return;
    }

    const now = audioContextRef.current.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(target, now + durationMs / 1000);
  }, []);

  const applyVolume = useCallback(
    (nextVolume: number, track?: MusicTrack | null) => {
      const normalizedGain = (track ?? currentTrack)?.normalizedGain ?? 0.92;
      const target = clampVolume(nextVolume) * normalizedGain;

      if (gainNodeRef.current) {
        fadeGain(target, 220);
      }

      if (audioRef.current) {
        audioRef.current.volume = clampVolume(nextVolume);
      }
    },
    [currentTrack, fadeGain],
  );

  const playTrackById = useCallback(
    async (trackId: string, userInitiated = false) => {
      const track = items.find((entry) => entry.id === trackId);
      const audio = audioRef.current;

      if (!track || !audio) {
        return;
      }

      try {
        await ensureAudioGraph();

        if (audio.src !== track.url) {
          if (!audio.paused) {
            fadeGain(0, 180);
            await new Promise((resolve) => window.setTimeout(resolve, 180));
          }

          audio.src = track.url;
          audio.load();
        }

        applyVolume(prefs.volume, track);
        await audio.play();
        setCurrentTrackId(track.id);
        setHasPlaybackPermission(true);
        setAutoplayBlocked(false);
        setIsPlaying(true);

        persistPrefs((prev) => ({
          ...prev,
          trackId: track.id,
          autoplay: userInitiated ? true : prev.autoplay,
        }));
      } catch {
        setAutoplayBlocked(true);
        setIsPlaying(false);
      }
    },
    [applyVolume, ensureAudioGraph, fadeGain, items, persistPrefs, prefs.volume],
  );

  const pause = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    fadeGain(0, 160);

    window.setTimeout(() => {
      audio.pause();
      setIsPlaying(false);
      applyVolume(prefs.volume, currentTrack);
    }, 170);
  }, [applyVolume, currentTrack, fadeGain, prefs.volume]);

  const togglePlayPause = useCallback(
    async (userInitiated = false) => {
      if (!items.length) {
        return;
      }

      const trackToPlay = currentTrackId ?? items[0].id;

      if (isPlaying) {
        pause();
        return;
      }

      await playTrackById(trackToPlay, userInitiated);
    },
    [currentTrackId, isPlaying, items, pause, playTrackById],
  );

  const playNext = useCallback(async () => {
    if (!items.length) {
      return;
    }

    const index = items.findIndex((track) => track.id === currentTrackId);
    const next = items[(index + 1 + items.length) % items.length];
    await playTrackById(next.id);
  }, [currentTrackId, items, playTrackById]);

  useEffect(() => {
    nextTrackRef.current = playNext;
  }, [playNext]);

  const playPrevious = useCallback(async () => {
    if (!items.length) {
      return;
    }

    const index = items.findIndex((track) => track.id === currentTrackId);
    const prev = items[(index - 1 + items.length) % items.length];
    await playTrackById(prev.id);
  }, [currentTrackId, items, playTrackById]);

  const setVolumeLevel = useCallback(
    (nextVolume: number) => {
      const normalized = clampVolume(nextVolume);
      applyVolume(normalized, currentTrack);
      persistPrefs((prev) => ({ ...prev, volume: normalized }));
    },
    [applyVolume, currentTrack, persistPrefs],
  );

  const setCountry = useCallback(
    (country: FilterValue) => {
      persistPrefs((prev) => ({ ...prev, country }));
    },
    [persistPrefs],
  );

  const setMood = useCallback(
    (mood: FilterValue) => {
      persistPrefs((prev) => ({ ...prev, mood }));
    },
    [persistPrefs],
  );

  const setTag = useCallback(
    (tag: FilterValue) => {
      persistPrefs((prev) => ({ ...prev, tag }));
    },
    [persistPrefs],
  );

  const setFocusMode = useCallback(
    (enabled: boolean) => {
      persistPrefs((prev) => ({ ...prev, focusMode: enabled }));
    },
    [persistPrefs],
  );

  const setExpanded = useCallback(
    (expanded: boolean) => {
      persistPrefs((prev) => ({ ...prev, expanded }));
    },
    [persistPrefs],
  );

  const setPanelVisible = useCallback(
    (panelVisible: boolean) => {
      persistPrefs((prev) => ({ ...prev, panelVisible }));
    },
    [persistPrefs],
  );

  const togglePanelVisible = useCallback(() => {
    persistPrefs((prev) => ({ ...prev, panelVisible: !prev.panelVisible }));
  }, [persistPrefs]);

  const setPanelPosition = useCallback(
    (value: { x: number; y: number }) => {
      persistPrefs((prev) => ({ ...prev, panelPosition: value }));
    },
    [persistPrefs],
  );

  const acknowledgePlaybackIntent = useCallback(() => {
    setHasPlaybackPermission(true);
    setAutoplayBlocked(false);
    persistPrefs((prev) => ({ ...prev, autoplay: true }));
  }, [persistPrefs]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const onDurationChange = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    const onPlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };

    const onPause = () => {
      setIsPlaying(false);
      setIsBuffering(false);
    };

    const onWaiting = () => {
      setIsBuffering(true);
    };

    const onCanPlay = () => {
      setIsBuffering(false);
    };

    const onEnded = () => {
      void nextTrackRef.current();
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);

    audio.volume = prefsStore.getSnapshot().volume;

    return () => {
      audio.pause();
      audio.src = "";
      audio.load();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);

      const context = audioContextRef.current;

      if (context) {
        if (context.state !== "closed") {
          void context.close().catch(() => {
            // ignore double-close race in strict mode
          });
        }
      }

      sourceNodeRef.current = null;
      gainNodeRef.current = null;
      analyserRef.current = null;
      audioContextRef.current = null;
      audioRef.current = null;
      setAnalyserNode(null);
    };
  }, []);

  useEffect(() => {
    applyVolume(prefs.volume, currentTrack);
  }, [applyVolume, currentTrack, prefs.volume]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoadingCatalog(true);
      setCatalogError(null);

      try {
        const catalog = await fetchCatalog({
          country: prefs.country,
          mood: prefs.mood,
          tag: prefs.tag,
        });

        if (cancelled) {
          return;
        }

        setItems(catalog.items);
        setCountries(catalog.countries);
        setMoods(catalog.moods);
        setTags(catalog.tags);

        if (!catalog.items.length) {
          setCurrentTrackId(null);
          return;
        }

        setCurrentTrackId((prev) => {
          const current = prev ?? prefs.trackId;
          const exists = current ? catalog.items.some((track) => track.id === current) : false;
          return exists ? current : catalog.items[0].id;
        });
      } catch (error) {
        if (!cancelled) {
          setItems([]);
          setCurrentTrackId(null);
          const message = error instanceof Error ? error.message : "Unable to load cloud music catalog.";
          setCatalogError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCatalog(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [prefs.country, prefs.mood, prefs.tag, prefs.trackId]);

  useEffect(() => {
    if (prefs.autoplay && prefs.trackId && items.length) {
      const exists = items.some((track) => track.id === prefs.trackId);

      if (exists) {
        const timeout = window.setTimeout(() => {
          void playTrackById(prefs.trackId!);
        }, 0);
        return () => window.clearTimeout(timeout);
      }
    }
  }, [items, playTrackById, prefs.autoplay, prefs.trackId]);

  useEffect(() => {
    document.body.setAttribute("data-focus-mode", prefs.focusMode ? "on" : "off");
    document.documentElement.setAttribute("data-focus-mode", prefs.focusMode ? "on" : "off");
  }, [prefs.focusMode]);

  const contextValue = useMemo<MusicContextValue>(
    () => ({
      items,
      countries,
      moods,
      tags,
      catalogError,
      selectedCountry: prefs.country,
      selectedMood: prefs.mood,
      selectedTag: prefs.tag,
      currentTrack,
      currentTime,
      duration,
      isPlaying,
      isBuffering,
      isLoadingCatalog,
      hasPlaybackPermission,
      autoplayBlocked,
      volume: prefs.volume,
      focusMode: prefs.focusMode,
      isExpanded: prefs.expanded,
      isPanelVisible: prefs.panelVisible,
      panelPosition: prefs.panelPosition,
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
      setPanelVisible,
      togglePanelVisible,
      setPanelPosition,
      acknowledgePlaybackIntent,
    }),
    [
      items,
      countries,
      moods,
      tags,
      catalogError,
      prefs.country,
      prefs.mood,
      prefs.tag,
      prefs.volume,
      prefs.focusMode,
      prefs.expanded,
      prefs.panelVisible,
      prefs.panelPosition,
      currentTrack,
      currentTime,
      duration,
      isPlaying,
      isBuffering,
      isLoadingCatalog,
      hasPlaybackPermission,
      autoplayBlocked,
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
      setPanelVisible,
      togglePanelVisible,
      setPanelPosition,
      acknowledgePlaybackIntent,
    ],
  );

  return (
    <MusicContext.Provider value={contextValue}>
      {children}
      {isClient && prefs.panelVisible ? <MusicPanel /> : null}
    </MusicContext.Provider>
  );
}

export function useMusicPlayer() {
  const value = useContext(MusicContext);

  if (!value) {
    throw new Error("useMusicPlayer must be used inside MusicProvider");
  }

  return value;
}
