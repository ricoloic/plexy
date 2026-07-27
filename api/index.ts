import { PLEX } from "@/constants";
import axios, { Canceler } from "axios";
import _ from "lodash";
import qs from "qs";
import { PlexServer } from "@/type";

const includes = {
  includeDetails: 1,
  includeMarkers: 1,
  includeOnDeck: 1,
  includeChapters: 1,
  includeChildren: 1,
  includeExternalMedia: 1,
  includeExtras: 1,
  includeConcerts: 1,
  includeReviews: 1,
  includePreferences: 1,
  includeStations: 1,
  includeAdvanced: 1,
  includeMarkerCounts: 1,
  includeAugmentations: 1,
  includeRelated: 1,
};

const version = () => {
  const userAgent = navigator.userAgent;
  let browserVersion = "Unknown";

  // Check for different browsers
  const browsers = [
    { name: "Chrome", identifier: "Chrome" },
    { name: "Safari", identifier: "Version" },
    { name: "Opera", identifier: "OPR" },
    { name: "Firefox", identifier: "Firefox" },
    { name: "Internet Explorer", identifier: ["MSIE", "Trident"] },
  ];

  for (const browser of browsers) {
    if (Array.isArray(browser.identifier)) {
      if (browser.identifier.some((id) => userAgent.includes(id))) {
        browserVersion = userAgent
          .split(browser.identifier[0])[1]
          .split(" ")[0];
        break;
      }
    } else if (userAgent.includes(browser.identifier)) {
      browserVersion = userAgent.split(browser.identifier)[1].split(" ")[0];
      break;
    }
  }

  return browserVersion;
};

const browser = () => {
  const userAgent = navigator.userAgent;
  let browserName = "Unknown";

  // Check for different browsers
  const browsers = [
    { name: "Chrome", identifier: "Chrome" },
    { name: "Safari", identifier: "Safari" },
    { name: "Opera", identifier: "Opera" },
    { name: "Firefox", identifier: "Firefox" },
    { name: "Internet Explorer", identifier: ["MSIE", "Trident"] },
  ];

  for (const browser of browsers) {
    if (Array.isArray(browser.identifier)) {
      if (browser.identifier.some((id) => userAgent.includes(id))) {
        browserName = browser.name;
        break;
      }
    } else if (userAgent.includes(browser.identifier)) {
      browserName = browser.name;
      break;
    }
  }

  return browserName;
};

export const xprops = (token = localStorage.getItem("token")) => {
  return {
    "X-Incomplete-Segments": "1",
    "X-Plex-Product": PLEX.application,
    "X-Plex-Version": "0.1.0",
    "X-Plex-Client-Identifier": localStorage.getItem("clientId") as string,
    "X-Plex-Platform": browser(),
    "X-Plex-Platform-Version": version(),
    "X-Plex-Features": "external-media,indirect-media,hub-style-list",
    "X-Plex-Model": "bundled",
    "X-Plex-Device": browser(),
    "X-Plex-Device-Name": browser(),
    "X-Plex-Device-Screen-Resolution": `${window.screen.width}x${window.screen.height}`,
    "X-Plex-Token": token as string,
    "X-Plex-Language": "en",
    "X-Plex-Session-Id": sessionStorage.getItem("sessionId") as string,
    "X-Plex-Session-Identifier": window.plexSessionId ?? "",
    session: window.sessionId ?? "",
  };
};

export const streamprops = ({
  id,
  limitation,
}: {
  id: string;
  limitation: {
    autoAdjustQuality?: boolean;
    maxVideoBitrate?: number;
  };
}) => {
  return {
    path: "/library/metadata/" + id,
    protocol: "dash",
    fastSeek: 1,
    directPlay: 0,
    directStream: 1,
    subtitleSize: 100,
    audioBoost: 200,
    addDebugOverlay: 0,
    directStreamAudio: 1,
    mediaBufferSize: 102400,
    subtitles: "burn",
    "Accept-Language": "en",
    ...xprops(),
    ...(limitation.autoAdjustQuality
      ? {
          autoAdjustQuality: limitation.autoAdjustQuality ? 1 : 0,
        }
      : {}),
    ...(limitation.maxVideoBitrate
      ? {
          maxVideoBitrate: limitation.maxVideoBitrate,
        }
      : {}),
  };
};

export interface RecommendationShelf {
  title: string;
  library: string;
  dir: string;
  link: string;
  key: string;
}

export class Api {
  static async pin(props: { uuid: string }) {
    return axios.post<{ id: number; code: string }>(
      `https://plex.tv/api/v2/pins?X-Plex-Client-Identifier=${props.uuid}&X-Plex-Product=${PLEX.application}&strong=true`,
      undefined,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
  }
  static async token(props: { pin: string; uuid: string }) {
    return axios.get<{ authToken: string }>(
      `https://plex.tv/api/v2/pins/${props.pin}?X-Plex-Client-Identifier=${props.uuid}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
  }
  static async users() {
    return axios.get(
      `https://clients.plex.tv/api/home/users?${qs.stringify({
        ...xprops(localStorage.getItem("auth-token")),
      })}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
  }
  static async switch({ uuid, pin }: { uuid: string; pin?: string }) {
    return axios.post<Plex.UserData>(
      `https://clients.plex.tv/api/v2/home/users/${uuid}/switch?${qs.stringify({
        ...xprops(localStorage.getItem("auth-token")),
        includeSubscriptions: 1,
        includeProviders: 1,
        includeSettings: 1,
        includeSharedSettings: 1,
        ...(pin ? { pin } : {}),
      })}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
  }
  static async servers() {
    return axios.get<PlexServer[]>(
      `https://clients.plex.tv/api/v2/resources?${qs.stringify({
        includeHttps: 1,
        includeRelay: 1,
        includeIPv6: 1,
        ...xprops(localStorage.getItem("auth-token")),
      })}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
  }
  static async user({ token, uuid }: { token: string; uuid: string }) {
    return axios.get<Plex.UserData>(
      `https://plex.tv/api/v2/user?X-Plex-Token=${token}&X-Plex-Product=${PLEX.application}&X-Plex-Client-Identifier=${uuid}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
  }
}

export class ServerApi {
  static async validate({ token }: { token: string }) {
    return await axios
      .get(`${localStorage.getItem("server")}/?X-Plex-Token=${token}`)
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async identity({ token }: { token: string }) {
    return await axios
      .get(`${localStorage.getItem("server")}/identity`, {
        headers: {
          "X-Plex-Token": token,
        },
      })
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async metadata({ id }: { id: string }) {
    return await axios
      .get<{ MediaContainer: { Metadata: Plex.Metadata[] } }>(
        `${localStorage.getItem("server")}/library/metadata/${id}?${qs.stringify(
          {
            ...includes,
            ...xprops(),
          },
        )}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return res?.data?.MediaContainer?.Metadata &&
          res.data.MediaContainer.Metadata.length > 0
          ? res.data.MediaContainer.Metadata[0]
          : null;
      })
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async children({ id }: { id: string }) {
    return await axios
      .get<{ MediaContainer: { Metadata: Plex.Metadata[] } }>(
        `${localStorage.getItem("server")}/library/metadata/${id}/children?${qs.stringify(
          {
            ...includes,
            ...xprops(),
          },
        )}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return res?.data?.MediaContainer?.Metadata ?? null;
      })
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async genre({ dir, id }: { dir: string; id: string }) {
    return await axios
      .get<{ MediaContainer: { Metadata: Plex.Metadata[] } }>(
        `${localStorage.getItem("server")}/library/sections/${dir}/genre/${id}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return res?.data?.MediaContainer?.Metadata ?? null;
      })
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async similar({ id }: { id?: string | null }) {
    if (!id) return [];
    return await axios
      .get<{ MediaContainer: { Metadata: Plex.Metadata[] } }>(
        `${localStorage.getItem("server")}/library/metadata/${id}/similar?${qs.stringify(
          {
            limit: 10,
            excludeFields: "summary",
            includeMarkerCounts: 1,
            includeRelated: 1,
            includeExternalMedia: 0,
            async: 1,
            ...xprops(),
          },
        )}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return res?.data?.MediaContainer?.Metadata ?? [];
      })
      .catch((err) => {
        console.log(err);
        return [];
      });
  }
  static async related({ id }: { id?: string | null }) {
    if (!id) return [];
    return await axios
      .get<{ MediaContainer: { Hub: Plex.Hub[] } }>(
        `${localStorage.getItem("server")}/library/metadata/${id}/related?${qs.stringify(
          {
            ...includes,
            includeAugmentations: 1,
            includeExternalMetadata: 1,
            includeMeta: 1,
            limit: 15,
            ...xprops(),
          },
        )}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return res?.data?.MediaContainer?.Hub ?? [];
      })
      .catch((err) => {
        console.log(err);
        return [];
      });
  }
  static async libraries() {
    return await axios
      .get<{ MediaContainer: { Directory: Plex.LibrarySection[] } }>(
        `${localStorage.getItem("server")}/library/sections`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return _.filter(res.data.MediaContainer.Directory, (section) => {
          return section.type === "show" || section.type === "movie";
        });
      })
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async search({ query }: { query: string }) {
    return await axios
      .get<{ MediaContainer: { SearchResult: Plex.SearchResult[] } }>(
        `${localStorage.getItem("server")}/library/search?${qs.stringify({
          query,
          includeCollections: 1,
          includeExtras: 1,
          searchTypes: "movies,otherVideos,tv",
          limit: 50,
          "X-Plex-Token": localStorage.getItem("token") as string,
        })}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return res.data?.MediaContainer?.SearchResult ?? null;
      })
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async details({
    key,
    include = true,
  }: {
    key: string;
    include?: boolean;
  }) {
    return await axios
      .get<{ MediaContainer: Plex.LibraryDetails }>(
        `${localStorage.getItem("server")}/library/sections/${key}${include ? `?${qs.stringify(includes)}` : ""}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        if (!res.data) return null;
        return res.data.MediaContainer;
      })
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async library({
    key,
    directory = "",
    include = false,
  }: {
    key: string;
    directory?: string;
    include?: boolean;
  }) {
    return await axios
      .get<{
        MediaContainer: {
          Directory: Plex.Directory[];
          Metadata: Plex.Metadata[];
        };
      }>(
        `${localStorage.getItem("server")}/library/sections/${key}/${directory}${include ? `?${qs.stringify(includes)}` : ""}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async recommendations({
    libraries,
    include = false,
  }: {
    libraries: Plex.LibrarySection[];
    include?: boolean;
  }): Promise<RecommendationShelf[]> {
    const selections: RecommendationShelf[] = [];

    for (const library of libraries) {
      const genres = await ServerApi.library({
        key: library.key,
        directory: "genre",
        include,
      });

      if (
        !genres?.data.MediaContainer.Directory ||
        genres.data.MediaContainer.Directory.length === 0
      ) {
        continue;
      }

      const selected: Plex.Directory[] = [];

      // Get 5 random genres
      while (
        selected.length <
        Math.min(5, genres.data.MediaContainer.Directory.length)
      ) {
        const genre =
          genres.data.MediaContainer.Directory[
            Math.floor(
              Math.random() * genres.data.MediaContainer.Directory.length,
            )
          ];

        if (selected.includes(genre)) continue;

        selected.push(genre);
      }

      for (const genre of selected) {
        selections.push({
          key: `${library.key}-${selections.length}`,
          title: `${library.title} - ${genre.title}`,
          library: library.key,
          dir: `all?genre=${genre.key}`,
          link: `/library/${library.key}/dir/genre/${genre.key}`,
        });
      }
    }

    return selections.length > 0
      ? _.shuffle(selections)
      : ([] as RecommendationShelf[]);
  }
  static async random(
    { dir }: { dir: string | string[] },
    retries = 0,
  ): Promise<Plex.Metadata | null> {
    if (retries > 5) return null;
    const key = Array.isArray(dir) ? _.sample(dir)! : dir;

    const dirs = await ServerApi.library({
      key,
      directory: "genre",
    });

    if (!dirs?.data?.MediaContainer?.Directory) {
      return await new Promise((resolve) => {
        setTimeout(async () => {
          const res = await ServerApi.random({ dir }, retries + 1);
          resolve(res);
        }, 250);
      });
    }

    const items = await ServerApi.library({
      key,
      directory: `all?genre=${_.sample(dirs.data.MediaContainer.Directory)!.key}`,
    });

    if (!items) return null;

    return _.sample(items.data.MediaContainer.Metadata)!;
  }
  static async decision({
    id,
    limitation,
  }: {
    id: string;
    limitation: {
      autoAdjustQuality?: boolean;
      maxVideoBitrate?: number;
    };
  }) {
    return await axios
      .get(
        `${localStorage.getItem("server")}/video/:/transcode/universal/decision?${qs.stringify(
          {
            ...streamprops({
              id,
              limitation,
            }),
          },
        )}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return res.status === 200;
      })
      .catch((err) => {
        console.log(err);
        return false;
      });
  }
  static async ping() {
    return await axios
      .get(
        `${localStorage.getItem("server")}/video/:/transcode/universal/ping?${qs.stringify({ ...xprops() })}}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return res.status === 200;
      })
      .catch((err) => {
        console.log(err);
        return false;
      });
  }
  static async preferences() {
    return await axios
      .get<{ MediaContainer: Plex.ServerPreferences }>(
        `${localStorage.getItem("server")}/`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return res.data?.MediaContainer ?? null;
      })
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async queue({ uri }: { uri: string }) {
    return await axios
      .post<{ MediaContainer: { Metadata: Plex.Metadata[] } }>(
        `${localStorage.getItem("server")}/playQueues?${qs.stringify({
          type: "video",
          uri,
          continuous: 1,
          ...includes,
          ...xprops(),
        })}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return res.data?.MediaContainer?.Metadata ?? null;
      })
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async timeline({
    id,
    duration,
    state,
    time,
  }: {
    id: number;
    duration: number;
    state: "buffering" | "playing" | "paused" | "stopped";
    time: number;
  }) {
    return await axios
      .get<Plex.TimelineUpdateResult>(
        `${localStorage.getItem("server")}/:/timeline?${qs.stringify({
          ratingKey: id,
          key: `/library/metadata/${id}/`,
          duration: duration,
          state: state,
          playbackTime: time,
          time: time,
          context: "library",
          ...xprops(),
        })}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return res.data ?? null;
      })
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async continue({ dirs }: { dirs: string[] }) {
    return await axios
      .get<{ MediaContainer: { Hub: Plex.Hub[] } }>(
        `${localStorage.getItem("server")}/hubs/continueWatching?${qs.stringify(
          {
            contentDirectoryID: dirs.join(","),
            includeMeta: 1,
            excludeFields: "summary",
            ...xprops(),
          },
        )}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return res.data?.MediaContainer?.Hub ?? null;
      })
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async promoted({ dir, dirs }: { dir: string; dirs: string[] }) {
    return await axios
      .get<{ MediaContainer: { Hub: Plex.Hub[] } }>(
        `${localStorage.getItem("server")}/hubs/promoted?${qs.stringify({
          contentDirectoryID: dir,
          pinnedContentDirectoryID: dirs.join(","),
          includeMeta: 1,
          excludeFields: "summary",
          count: 12,
          includeLibraryPlaylists: 1,
          includeRecentChannels: 1,
          excludeContinueWatching: 1,
          ...includes,
          ...xprops(),
        })}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return res.data?.MediaContainer?.Hub ?? null;
      })
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async hubs({ id }: { id: string }) {
    return await axios
      .get<{ MediaContainer: { Hub: Plex.Hub[] } }>(
        `${localStorage.getItem("server")}/hubs/sections/${id}?${qs.stringify({
          includeMeta: 1,
          excludeFields: "summary",
          includeExternalMetadata: 1,
          count: 12,
          includeLibraryPlaylists: 1,
          includeRecentChannels: 1,
          includeCollections: 1,
          includeOnDeck: 1,
          ...xprops(),
        })}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return res.data?.MediaContainer?.Hub ?? null;
      })
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async key(
    { key, plain = false }: { key: string; plain?: boolean },
    other: Record<string, number | string> = {},
  ) {
    return await axios
      .get<{ MediaContainer: { Metadata: Plex.HubMetadata[] } }>(
        `${localStorage.getItem("server")}${key}${key.includes("?") ? "&" : "?"}${qs.stringify(
          {
            ...(plain
              ? {}
              : {
                  includeMeta: 1,
                  excludeFields: "summary",
                  includeExternalMetadata: 1,
                  count: 40,
                  includeLibraryPlaylists: 1,
                  includeRecentChannels: 1,
                  includeCollections: 1,
                  ...includes,
                }),
            ...xprops(),
            ...other,
          },
        )}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return res.data?.MediaContainer?.Metadata ?? null;
      })
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async all({
    id,
    start,
    size,
    canceler,
  }: {
    id: string;
    start: number;
    size: number;
    canceler: (c: Canceler) => void;
  }) {
    return await axios
      .get<{
        MediaContainer: { Metadata: Plex.Metadata[]; totalSize: number };
      }>(
        `${localStorage.getItem("server")}/library/sections/${id}/all?${qs.stringify(
          {
            includeMeta: 1,
            includeExternalMetadata: 1,
            includeLibraryPlaylists: 1,
            includeRecentChannels: 1,
            includeCollections: 1,
            excludeContinueWatching: 1,
            sort: "titleSort",
            "X-Plex-Container-Start": start,
            "X-Plex-Container-Size": size,
            ...includes,
            ...xprops(),
          },
        )}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
          cancelToken: new axios.CancelToken(canceler),
        },
      )
      .then((res) => {
        if (
          res.data?.MediaContainer?.totalSize &&
          res.data?.MediaContainer?.Metadata
        ) {
          return {
            results: res.data.MediaContainer.Metadata,
            total: res.data.MediaContainer.totalSize,
          };
        }
        return null;
      })
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async collections({ id }: { id: string }) {
    return await axios
      .get<{ MediaContainer: { Metadata: Plex.Metadata[] } }>(
        `${localStorage.getItem("server")}/library/sections/${id}/collections?${qs.stringify(
          {
            includeMeta: 1,
            excludeFields: "summary",
            includeExternalMetadata: 1,
            count: 20,
            includeLibraryPlaylists: 1,
            includeRecentChannels: 1,
            includeCollections: 1,
            excludeContinueWatching: 1,
            ...includes,
            ...xprops(),
          },
        )}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return res.data?.MediaContainer?.Metadata ?? null;
      })
      .catch((err) => {
        console.log(err);
        return null;
      });
  }
  static async audio({ part, stream }: { part: string; stream: string }) {
    return await axios
      .put(
        `${localStorage.getItem("server")}/library/parts/${part}?${qs.stringify(
          {
            audioStreamID: stream,
            ...xprops(),
          },
        )}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return !!res.data;
      })
      .catch((err) => {
        console.log(err);
        return false;
      });
  }
  static async subtitle({ part, stream }: { part: string; stream: string }) {
    return await axios
      .put(
        `${localStorage.getItem("server")}/library/parts/${part}?${qs.stringify(
          {
            subtitleStreamID: stream,
            ...xprops(),
          },
        )}`,
        {
          headers: {
            "X-Plex-Token": localStorage.getItem("token") as string,
            accept: "application/json",
          },
        },
      )
      .then((res) => {
        return !!res.data;
      })
      .catch((err) => {
        console.log(err);
        return false;
      });
  }
  /**
   * mark as watch
   * @param key
   */
  static async scrobble({ key }: { key: string }) {
    return await axios
      .get(
        `${localStorage.getItem("server")}/:/scrobble?${qs.stringify({ identifier: "com.plexapp.plugins.library", key, ...xprops() })}`,
        { headers: { accept: "application/json, text/plain, */*" } },
      )
      .then((res) => res.status === 200)
      .catch((err) => {
        console.error(err);
        return false;
      });
  }
  /**
   * mark as unwatch
   * @param key
   */
  static async unscrobble({ key }: { key: string }) {
    return await axios
      .get(
        `${localStorage.getItem("server")}/:/unscrobble?${qs.stringify({ key, identifier: "com.plexapp.plugins.library", ...xprops() })}`,
        { headers: { accept: "application/json, text/plain, */*" } },
      )
      .then((res) => res.status === 200)
      .catch((err) => {
        console.error(err);
        return false;
      });
  }
  static async discoverMetadata({ guid }: { guid: string }) {
    return await axios
      .get(
        `https://discover.provider.plex.tv/library/metadata/${guid}/userState?${qs.stringify({ ...xprops() })}`,
        { headers: { accept: "application/json, text/plain, */*" } },
      )
      .then((res) => res.status === 200)
      .catch((err) => {
        console.error(err);
        return false;
      });
  }
}
