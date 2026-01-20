## Build a REST API implementing REST2NOSTR Proxy

Your task is to plan out the building of a REST API server that implements the idea for a REST2NOSTR proxy. The code for this REST API server app should be placed in the `/app` directory. You can edit any files in the `/app` directory. The REST API server should be built using node.js JavaScript and the express.js library. It should also use dotenv to manage the use of environment variables. It should use [api-doc](https://www.npmjs.com/package/api-doc) to generate API documentation for the REST API.

### Nostr

Nostr is a social media protocol. It is defined by nip-01.md in the `nostr/` directory. This is the primary specification that defines Nostr, but there are many other NIPS for other features. If you need to dig deeper into the Nostr standards you can explore the [NIPs on Github](https://github.com/nostr-protocol/nips/tree/master).

The `nostr-sandbox/` directory contains a series of small example code snippets for common social media use-cases using Nostr. You can study this code understand how a Nostr Client would interact with a Nostr Relay.

[This discussion thread on GitHub](https://github.com/nostr-protocol/nips/issues/1549) introduces a concept called REST2NOSTR. It solves an common issue experienced by JavaScript web developers: a high preference for REST APIs over Websockets. The proposal is to create a REST API server that operates as a proxy for the Websockets protocol used by Nostr Relays. This would allow Client developers to interact with a Nostr Relay over a familiar REST API, instead of using Websockets. Here is a summary of the API endpoints the discussion proposes:

| REST Method | Endpoint | Nostr WebSocket Equivalent | Purpose |
| --- | --- | --- | --- |
| `POST` | `/event` | `["EVENT", <event>]` | Publish a signed Nostr event to the relay. |
| `GET` | `/req/` | `["REQ", <sub_id>, <filters>]` | Retrieve a list of events based on filters (stateless query). |
| `POST`/`PUT` | `/req/` | `["REQ", <sub_id>, <filters>]` | Establish a subscription (for long-polling or SSE). |
| `DELETE` | `/req/` | `["CLOSE", <sub_id>]` | Close an existing subscription. |

Your task is to plan out the building of a REST API server that implements the idea for a REST2NOSTR proxy. All code examples in the `nostr-sandbox/` directory that interact with a Relay over Websockets should be able to be implemented using the new REST API. The code examples are a good benchmark to use as a frame of reference as to weather the REST API has been implemented correctly. It would be a good idea to create an `examples/` directory that contain many of these code example, refactored for use with the new REST API.

There is a similar implementation of REST2NOSTR available at [https://nostr-api.com/](https://nostr-api.com/). While the API and documentation are available, the source code for that implementation is not available. However, it is good to study as an example of the kind of output we are looking for.

### Follow the Clean Architecture code pattern

As you plan out the code layout, you should follow the Clean Architecture patterns. Here is background information you can follow to ensure you follow the Clean Architecture pattern:

*   [Clean Architecture Summary](https://raw.githubusercontent.com/christroutner/trouts-blog/refs/heads/master/blog/2021-07-06-clean-architecture/index.md) - This is a markdown document that summarizes the Clean Architecture pattern, and links to additional support information.
*   [ipfs-service-provider](https://github.com/Permissionless-Software-Foundation/ipfs-service-provider) - This is a node.js JavaScript code base that follows the Clean Architecture patterns. Notice that within the `src` directory, the sub-directories are split up according to the guidance in the Clean Architecture Summary article. This is the primary pattern you should follow.
    *   A copy of the ipfs-service-provider repository has been copied to the `clean-architecture/` directory, so that you can study the code locally.

### Summary

Your task is to plan out the building of a REST API server that implements the idea for a REST2NOSTR proxy. The code for this REST API server app should be placed in the `/app` directory. You can edit any files in the `/app` directory. The REST API server should be built using node.js JavaScript and the express.js library. It should also use dotenv to manage the use of environment variables. It should use [api-doc](https://www.npmjs.com/package/api-doc) to generate API documentation for the REST API.