This is pre-design documentation of client application.

Overall approach: Design-Document-Implement

Platform: iOS latest;
Main device: iPhone 15
Distribution: Personal app, so distribution in test mode through xCode manually

Framework: Swift (Native application)

Goal: allow for convenient query/control of the /smartlife and /omniscient projects through the /api.

Design steps:

Design decisions:
    Auth: The app is distributed by hand, so the secret may be injected from local .env on build and packaged together with the application to the end-device
        No further auth framework is required for the initial implementation - but will be integrated both with client and server later.
    Endpoints: Currently available endpoints are to be utilized wherever possible. The amount of endpoints is to be kept slim.
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
