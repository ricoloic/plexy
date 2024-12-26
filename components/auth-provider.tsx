"use client";

import { ReactNode, useEffect, useState } from "react";
import { uuidv4 } from "@/lib/utils";
import { Api, ServerApi } from "@/api";
import { PLEX } from "@/constants";
import _ from "lodash";
import { XMLParser } from "fast-xml-parser";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | undefined>();

  useEffect(() => {
    let pin = localStorage.getItem("pin");
    const stored = localStorage.getItem("token");
    const pinId = new URL(location.href).searchParams.get("pinID");
    let uuid = localStorage.getItem("uuid");

    if (!uuid) {
      uuid = uuidv4();
      localStorage.setItem("uuid", uuid);
    }

    if (!stored) {
      if (!pinId) {
        Api.pin({ uuid })
          .then((res) => {
            pin = res.data.code;
            localStorage.setItem("pin", pin);
            window.location.href = `https://app.plex.tv/auth/#!?clientID=${
              uuid
            }&context[device][product]=${
              PLEX.application
            }&context[device][version]=4.118.0&context[device][platform]=Firefox&context[device][platformVersion]=122.0&context[device][device]=Linux&context[device][model]=bundled&context[device][screenResolution]=1920x945,1920x1080&context[device][layout]=desktop&context[device][protocol]=${window.location.protocol.replace(
              ":",
              "",
            )}&forwardUrl=${window.location.protocol}//${
              window.location.host
            }/login?pinID=${res.data.id}&code=${res.data.code}&language=en`;
          })
          .catch((err) => {
            console.error(err);
            // TODO: handle error
          });
      } else {
        Api.token({ uuid, pin: pinId })
          .then(async (res) => {
            // should have the token here
            if (!res.data.authToken) {
              // TODO: handle error
              console.log(res.data);
              return;
            }

            localStorage.setItem("token", res.data.authToken);
            localStorage.setItem("auth-token", res.data.authToken);
            Api.servers().then((res2) => {
              if (
                !res2.data ||
                res2.data.length === 0 ||
                !res2.data[0].connections ||
                res2.data[0].connections.length === 0
              )
                return;
              localStorage.setItem("server", res2.data[0].connections[0].uri);
              setToken(res.data.authToken);
              window.location.href = "/";
              return;
            });
          })
          .catch((err) => {
            console.error(err);
            // TODO: handle error
          });
      }
    } else {
      Api.servers()
        .then((res2) => {
          if (
            !res2.data ||
            res2.data.length === 0 ||
            !res2.data[0].connections ||
            res2.data[0].connections.length === 0
          )
            return;
          localStorage.setItem("server", res2.data[0].connections[0].uri);
          setToken(stored);
          return;
        })
        .catch((err) => {
          if (err.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.log(err.response.data);
            console.log(err.response.status);
            console.log(err.response.headers);
            if (err.response.status === 401) {
              localStorage.removeItem("token");
              window.location.href = "/";
              return;
            }
          } else if (err.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            console.log(err.request);
          }
          console.error(err);
          // TODO: handle other errors
        });
    }
  }, []);

  if (!token) return null;

  return children;
}
