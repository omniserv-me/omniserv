This is pre-design documentation of client application.

Overall approach: Design-Document-Implement

Platform: iOS latest;
Main device: iPhone 15
Distribution: Personal app, so distribution in test mode through xCode manually

Framework: Swift (Native application)

Goal: allow for convenient query/control of the /smartlife and /omniscient projects through the /api.

Design steps:

Design decisions:
    Auth: The app is distributed by hand, so the secrets may be injected from local .env on build and packaged together with the application to the end-device.
        Bundling the secrets is an accepted risk: single user, single device, rotation is just a rebuild.
        No auth framework (accounts, OAuth, per-user tokens) is required for the initial implementation. A minimal "phase 0" is required though, together with the server:
            1. The API secret travels in a header (Authorization: Bearer <secret>), never in the URL. URLs end up in access logs and Cloudflare logs.
            2. Cloudflare Access with a service token in front of api.omniserv.me, so unauthenticated traffic is rejected at the edge.
               The app sends the two CF-Access-* headers, injected from .env the same way as the API secret.
            3. The backend publishes no host ports except what cloudflared needs, so the edge can't be bypassed from the LAN (gRPC and Mongo have no auth).
        Revisit (per-client tokens, scopes, a real auth framework) when a second user, a second client besides the app and the Shortcuts, or exposure outside Cloudflare appears.
    Endpoints: The amount of endpoints is to be kept slim. The client uses a new, versioned API (/v1) that follows HTTP conventions:
            GET reads and never changes state; POST creates; PATCH partially updates; DELETE removes.
            Inputs go in the path (resource ids), the query string (filters) or a JSON body (writes) - never secrets.
            Statuses mean what they say: 200/201/204 on success, 401 wrong secret, 404 unknown resource, 422 invalid input, 5xx server side; errors have a JSON body.
        Existing (legacy) endpoints stay untouched until the Shortcuts automations are moved to /v1, then they are removed.
        Addition of new endpoints is possible: they first are to be designed and documented in the design doc and only then implemented.
        Every endpoint is to have clearly defined scope and goal.
    UI: UI is designed to be responsive and feel light-weight.
        Theme: White/LightBlue
        Pages:
            Main page with overview widgets: 1 for project omniscient, showing a pie diagram of the monthly budget (according to a frontend-set setting)
                and 1 smartlife widget showing the state of devices available through the backend (currently only the strip); 
                main characteristic to display is current brightness. Further features can be designed and implemented as well.
                A menu leading into other pages (omniscient, smartlife, settings) should be easily accessible.
            Omniscient: a page with budgeting overview charts. Different views are to implement: 1. a numeric view comparing planned budget and factual spending
                for a set and adjustable period (planned budget inferred from monthly goal set in settings), with an ability to view historical data.
                2. a graph of daily/monthly (adjustable by user) spending dynamic; 
                3. a form to add new checks to the database (shop name, amount in eur, datetime with default now, from user)
            Smartlife: tiles with device info (currently 1), administered through smartlife backend. For the cololight strip the tile shows current brightness 
                and enables brightness change through a slider. This slider sets new brightness on any change.
            Settings: shows all options available for user. Currently only monthly spending goal.
