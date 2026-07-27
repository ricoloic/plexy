import { PlexConnection, PlexServer } from "@/type";
import axios from "axios";
import { Api } from "@/api";
import { LibraryAndServer } from "@/components/server-provider";
import { flatMap } from "lodash";

export async function fetchConnectionLibrary(
  {
    server,
    connection,
  }: {
    server: PlexServer;
    connection: PlexConnection;
  },
  signal: AbortSignal | undefined = undefined,
) {
  return axios
    .get<{ MediaContainer: { Directory: Plex.LibrarySection[] } }>(
      `${connection.uri}/library/sections`,
      {
        headers: {
          "X-Plex-Token": server.accessToken as string,
          accept: "application/json",
        },
        signal,
        timeout: 10_000,
      },
    )
    .then(({ data }) => {
      if (data) {
        return {
          libraries: data.MediaContainer.Directory,
          server,
          connection,
        } as LibraryAndServer;
      } else {
        return null;
      }
    })
    .catch((err) => {
      console.error(err);
      return null;
    });
}

export async function fetchLibraries(
  server: PlexServer,
  controllers: AbortController[],
) {
  const promises: Promise<LibraryAndServer | null>[] = server.connections.map(
    (connection, index) =>
      new Promise((resolve2) => {
        fetchConnectionLibrary(
          { server, connection },
          controllers[index].signal,
        )
          .then((info) => {
            if (info) {
              resolve2(info);
            } else {
              setTimeout(() => resolve2(null), 60_000);
            }
          })
          .catch((error) => {
            console.error(error);
            setTimeout(() => resolve2(null), 60_000);
          });
      }),
  );

  // Use Promise.race to stop as soon as we find a valid server
  const result: LibraryAndServer | null = await Promise.race(promises);

  // Abort remaining requests
  controllers.forEach((controller) => controller.abort());

  return result;
}

export async function fetchAvailableServers() {
  return Api.servers().then(async (res) => {
    let list = Array.isArray(res.data) ? res.data : [];

    // remove the server with no connections or no accessToken from the list
    for (let i = list.length - 1; i >= 0; i--) {
      if (!list[i].connections?.length || !list[i].accessToken) {
        list.splice(i, 1);
      }
    }

    // if no server is not available
    if (list.length === 0) {
      return { list: [], info: null };
    }

    const promises = list.map((server) => {
      // create an array of promises for each connection
      const controllers = server.connections.map(() => new AbortController());
      return [fetchLibraries(server, controllers), controllers] as [
        Promise<LibraryAndServer | null>,
        AbortController[],
      ];
    });
    const info = await Promise.race(promises.map(([call]) => call));
    promises.forEach(([_, controllers]) =>
      controllers.forEach((controller) => controller.abort()),
    );
    return {
      info,
      list,
      controllers: flatMap(promises, ([_, controllers]) => controllers),
    };
  });
}

export async function fetchExistingServer(currentConnectionUri: string) {
  return currentConnectionUri
    ? Api.servers()
        .then((res) => {
          let list = Array.isArray(res.data) ? res.data : [];

          let connected: PlexServer | null = null;

          // remove the server with no connections or no accessToken from the list
          for (let i = list.length - 1; i >= 0; i--) {
            if (!list[i].connections?.length || !list[i].accessToken) {
              list.splice(i, 1);
            }
          }

          for (const server of list) {
            for (const connection of server.connections) {
              if (connection.uri === currentConnectionUri) {
                connected = server;
                break;
              }
            }
          }

          if (connected) {
            return fetchConnectionLibrary({
              connection: connected.connections.find(
                ({ uri }) => uri === currentConnectionUri,
              )!,
              server: connected,
            }).then((info) => {
              return info;
            });
          }
          return null;
        })
        .catch((error) => {
          console.error(error);
          return null;
        })
    : null;
}
