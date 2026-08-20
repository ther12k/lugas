# Bun 1.4.0 Characterization

Observed on Linux 7.0.0-28-generic x64 with Bun 1.4.0.

| Behavior | Observation | Confidence |
|---|---|---|
| Exact route | Matches exact path | tested |
| Param route | Route descriptor form did not match in this Bun 1.4.0 probe | unexecuted |
| Wildcard route | Route descriptor form did not match in this Bun 1.4.0 probe | unexecuted |
| Fallback | `fetch` handles misses | tested |
| `server.fetch` | Direct in-process request works | tested |
| Port 0 | Allocates ephemeral nonzero port | tested |
| Stop | `stop(true)` completes cleanly | tested |
| HEAD/OPTIONS/405, files/directories, abort/body limits | Not characterized in this Linux fixture | unexecuted |

## Safe native route values

Function handlers, static `Response` values, `Bun.file` values, and method maps require dedicated follow-up tests before Lugas pass-through policy. This issue proves function handlers and fallback only.

Platform gaps: macOS and Windows unexecuted. No performance claims.
