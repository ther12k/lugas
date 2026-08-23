import { createClient } from "lugas/client";
       const c = createClient({ baseUrl: "https://x.test" });
       if (!c || typeof c.get !== "function") throw new Error("bad client");
       console.log("BUNDLE-SUBPATH-OK");