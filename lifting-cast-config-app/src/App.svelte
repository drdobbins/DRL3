<script>
    import * as R from "ramda";
    import {isBefore, parse, startOfToday} from "date-fns"

    // import * as data from "./data"

    let DEBUG_LOGGING = true;

    function debug_log(...args) {
        if (DEBUG_LOGGING) {
            console.log.apply(undefined, args);
        }
    }

    const DRL_URL = "/lifting-cast-platform-config";

    // These will be sent to the server as "server_type"; the values match those expected server-side.
    const SERVER_TYPE = {
        LIFTING_CAST: "mainSite",
        RELAY_SERVER: "relay"
    }

    const LIFTING_CAST_DOT_COM_BASE_URL = "https://liftingcast.com"
    const LIFTING_CAST_DOT_COM_CREDENTIAL_CHECK_URL = "https://couchdb.liftingcast.com/_session";

    let serverType = SERVER_TYPE.LIFTING_CAST;
    $: debug_log("serverType set to", serverType);

    let relayServerIpAddress = "";
    $: relayServerBaseUrl = `http://${relayServerIpAddress}`;
    $: relayServerCredentialCheckUrl = `http://${relayServerIpAddress}:5984/_session`;
    $: debug_log("relayServerCredentialCheckUrl set to", relayServerCredentialCheckUrl);
    $: isRelayServer = serverType === SERVER_TYPE.RELAY_SERVER;
    $: liftingCastBaseUrl = isRelayServer
                            ? relayServerBaseUrl
                            : LIFTING_CAST_DOT_COM_BASE_URL;
    $: credentialCheckUrl = isRelayServer
                            ? relayServerCredentialCheckUrl
                            : LIFTING_CAST_DOT_COM_CREDENTIAL_CHECK_URL;
    $: liftingCastApiUrl = `${liftingCastBaseUrl}/api`;

    $: debug_log("baseUrl set to", liftingCastBaseUrl);
    // Or http://<ip address>
    //   ex:
    //   let liftingCastBaseUrl = "http://10.0.0.58";

    let meetsPromise;
    let meetsForDebug = [];
    let selectedMeetId = "";
    $: debug_log("meet selected:", R.find(R.propEq("_id", selectedMeetId), meetsForDebug));

    let platformsPromise;
    let platformsForDebug = [];
    let selectedPlatformId = "";
    $: debug_log("platform selected:", R.find(R.propEq("_id", selectedPlatformId), platformsForDebug));

    let password = "";
    $: debug_log("password set to", password);

    let attemptedToCheckLiftingCastCredentials = false;
    $: debug_log("attemptedToCheckLiftingCastCredentials set to", attemptedToCheckLiftingCastCredentials);

    let completedCheckingLiftingCastCredentials = false;
    $: debug_log("completedCheckingLiftingCastCredentials set to", completedCheckingLiftingCastCredentials);

    let areLiftingCastCredentialsValid = false;
    $: debug_log("areLiftingCastCredentialsValid set to", areLiftingCastCredentialsValid);

    let liftingCastLoginResponse = "";
    $: debug_log("liftingCastLoginResponse:", liftingCastLoginResponse);

    $: canSubmitConfigurationToDrl =
        attemptedToCheckLiftingCastCredentials
        && completedCheckingLiftingCastCredentials
        && areLiftingCastCredentialsValid
        && (serverType === SERVER_TYPE.LIFTING_CAST
            || (serverType === SERVER_TYPE.RELAY_SERVER && !R.isEmpty(relayServerIpAddress)))
        && selectedMeetId
        && password
        && selectedPlatformId;
    // let canSubmitConfigurationToDrl = true;
    $: debug_log("canSubmitConfigurationToDrl", canSubmitConfigurationToDrl);

    let isDrlConfigured = false;
    $: debug_log("isDrlConfigured set to", isDrlConfigured);

    function handleRelayUrlTextFieldKeyDown(event) {
        if (event.key === "Enter") {
            meetsPromise = fetchMeets();
        }
    }

    function parseDate(dateString) {
        return parse(dateString, "MM/dd/yyyy", new Date());
    }

    function isBeforeToday(dateString) {
        return isBefore(parseDate(dateString), startOfToday());
    }

    function liftingCastMeetsUrl() {
        return `${liftingCastApiUrl}/meets`;
    }

    function liftingCastPlatfomsUrl(meetId) {
        return `${liftingCastApiUrl}/meets/${meetId}/platforms`;
    }

    async function fetchMeets() {
        debug_log("Fetching meets")
        const response = await fetch(liftingCastMeetsUrl());
        const json = await response.json();
        // TODO: Handle HTTP errors and response errors
        const docs = json.docs;
        const meets = R.transduce(
            R.compose(
                R.filter(R.prop("date")),
                R.filter(R.propSatisfies((dateString) => !isBeforeToday(dateString), "date"))
            ),
            R.flip(R.append),
            [],
            R.sortBy(R.prop("date"))(docs)
        );

        debug_log("sorted meets not in the past", meets);
        meetsForDebug = meets;

        return meets;
    }

    async function fetchMeetsDebug() {
        debug_log("Using meets from data.json file")
        const docs = data.meets;
        const meets = R.transduce(
            R.compose(
                R.filter(R.prop("date")),
                R.filter(R.propSatisfies((dateString) => !isBeforeToday(dateString), "date"))
            ),
            R.flip(R.append),
            [],
            R.sortBy(R.prop("date"))(docs)
        );

        debug_log("sorted meets not in the past", meets);
        meetsForDebug = meets;

        return meets;
    }

    async function fetchPlatforms(meetId) {
        debug_log(`Fetching platforms for meet id ${meetId}`)
        const response = await fetch(liftingCastPlatfomsUrl(meetId));
        const json = await response.json();
        // TODO: Handle HTTP errors and response errors
        const docs = json.docs;
        const platforms = R.sortBy(R.prop("name"))(docs);

        debug_log("sorted platforms", JSON.stringify(platforms, undefined, 2));
        platformsForDebug = platforms;

        return platforms
    }

    async function fetchPlatformsDebug(meetId) {
        debug_log("Using platforms from data.json file")
        const docs = data.platforms;
        const platforms = R.sortBy(R.prop("name"))(docs);

        debug_log("sorted platforms", JSON.stringify(platforms, undefined, 2));
        platformsForDebug = platforms;

        return platforms
    }

    function handleMeetSelection(event) {
        const meetId = event.target.value
        selectedMeetId = meetId;
        debug_log("selectedMeetId", meetId);
        platformsPromise = fetchPlatforms(meetId);
    }

    function handlePlatformSelection(event) {
        const platformId = event.target.value;
        selectedPlatformId = platformId;
        debug_log("selectedPlatformId", platformId);
    }

    function isServerError(response) {
        return response.status >= 500;
    }

    function isUnauthorized(response) {
        return response.status === 401;
    }

    async function checkLiftingCastCredentials() {
        attemptedToCheckLiftingCastCredentials = true;

        debug_log(
            "Checking LiftingCast credentials:",
            JSON.stringify({
                    name: selectedMeetId,
                    password: password
                },
                undefined,
                2
            )
        );

        const request = new Request(
            credentialCheckUrl,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    name: selectedMeetId,
                    password: password
                })
            }
        );

        try {
            const response = await fetch(request);
            const json = await response.json();

            debug_log("response status:", response.status);
            debug_log("login response:", JSON.stringify(json, undefined, 2));
            debug_log("LiftingCast reports ok?", R.prop("ok", json));

            if (isUnauthorized(response)) {
                completedCheckingLiftingCastCredentials = true;
                liftingCastLoginResponse = JSON.stringify(json, undefined, 2);
                areLiftingCastCredentialsValid = false;
            }
            if (isServerError(response)) {
                completedCheckingLiftingCastCredentials = false;
                liftingCastLoginResponse =
                    `Something went wrong with the LiftingCast server: ${json}`;
                areLiftingCastCredentialsValid = undefined;
            }
            else if (!response.ok) {
                // Any other non-2xx HTTP response
                completedCheckingLiftingCastCredentials = true;
                liftingCastLoginResponse =
                    `Response from LiftingCast Server: ${JSON.stringify(json, undefined, 2)}`;
                areLiftingCastCredentialsValid = undefined;
            }
            else {
                // Success
                completedCheckingLiftingCastCredentials = true;
                areLiftingCastCredentialsValid = true;
            }
        } catch (e) {
            // Network error
            completedCheckingLiftingCastCredentials = false;
            liftingCastLoginResponse = e;
            areLiftingCastCredentialsValid = undefined;
        }
    }

    function handlePasswordTextFieldKeyDown(event) {
        if (event.key === "Enter") {
            checkLiftingCastCredentials();
        }
        else {
            attemptedToCheckLiftingCastCredentials = false;
            completedCheckingLiftingCastCredentials = false;
        }
    }

    async function sendLiftingCastInfoToDrl() {
        const conditionallyAddRelayServerIpAddress = R.when(
            R.propEq("server_type", SERVER_TYPE.RELAY_SERVER),
            R.assoc("local_relay_server_ip_address", relayServerIpAddress)
        );

        if (canSubmitConfigurationToDrl) {
            const request = new Request(
                DRL_URL,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(conditionallyAddRelayServerIpAddress({
                        server_type: serverType,
                        meet_id: selectedMeetId,
                        password: password,
                        platform_id: selectedPlatformId
                    }))
                }
            )
            const response = await fetch(request);
            // TODO: Handle network error.
            // TODO: Handle HTTP errors and response errors
            if (response.ok) {
                isDrlConfigured = true;
            }
            else {
                isDrlConfigured = false;
                // TODO: Error message
                // TODO: Retry? Recover?
            }
        }
    }
</script>

<main>
    <h1>{@html "DRL <-> LiftingCast Configuration"}</h1>

    <div>
        <label for="lifting-cast-server-type">
            <input
                    type="radio"
                    name="serverType"
                    id="lifting-cast-server-type"
                    bind:group={serverType}
                    value={SERVER_TYPE.LIFTING_CAST}
                    checked
            />
            LiftingCast.com
        </label>

        <label for="server-type-relay-server">
            <input
                    type="radio"
                    name="serverType"
                    id="server-type-relay-server"
                    bind:group={serverType}
                    value={SERVER_TYPE.RELAY_SERVER}
            />
            Relay Server
        </label>
    </div>

    {#if serverType === SERVER_TYPE.RELAY_SERVER}
        <label for="relay-server-ip-address">
            Relay server IP address (http://x.x.x.x)
        </label>
        <div style="display: flex">
            <span>http://</span>
            <input
                    type="url"
                    id="relay-server-ip-address"
                    bind:value={relayServerIpAddress}
                    on:keydown={handleRelayUrlTextFieldKeyDown}
            />
        </div>
    {/if}

    <button
            on:click={() => {meetsPromise = fetchMeets();}}
    >
        Fetch meets
    </button>

    {#if meetsPromise}
        <hr/>

        {#await meetsPromise}
            <p>... loading meets ...</p>
        {:then meets}
            <div>{meets.length} meets</div>
            <select
                    bind:value={selectedMeetId}
                    on:change={handleMeetSelection}
            >
                <option
                        disabled
                        selected
                        value
                >
                    Select a meet
                </option>

                {#each meets as meet, i}
                    <option
                            value={meet._id}
                    >
                        {meet.name} ({meet.date})
                    </option>
                {/each}
            </select>
        {:catch error}
            <p class="error">Network error; could not fetch meets from {liftingCastMeetsUrl()}</p>
            <p class="error">Error message: {error.message}</p>
            <button
                    on:click={() => {meetsPromise = fetchMeets();}}
            >
                Retry
            </button>
        {/await}
    {/if}

    {#if platformsPromise}
        <hr/>

        {#await platformsPromise}
            <p>... loading platforms ...</p>
        {:then platforms}
            <div>{platforms.length} platforms</div>
            <select
                    bind:value={selectedPlatformId}
                    on:change={handlePlatformSelection}
            >
                <option
                        disabled
                        selected
                        value
                >
                    Select a platform
                </option>
                {#each platforms as platform}
                    <option
                            value={platform._id}
                    >
                        {platform.name}
                    </option>
                {/each}
            </select>
        {:catch error}
            <p class="error">Network error; could not fetch platforms for meet {selectedMeetId}
                from {liftingCastPlatfomsUrl(selectedMeetId)}</p>
            <p class="error">Error message: {error.message}</p>
            <button
                    on:click={() => {platformsPromise = fetchPlatforms(selectedMeetId);}}
            >
                Retry
            </button>
        {/await}
    {/if}

    {#if selectedMeetId && selectedPlatformId}
        <hr/>

        <label for="password">
            LiftingCast meet password
        </label>
        <input
                type="text"
                id="password"
                style="display: block;"
                bind:value={password}
                on:keydown={handlePasswordTextFieldKeyDown}
        />
        <button
                style="display: block;"
                on:click={checkLiftingCastCredentials}
        >
            Verify meet credentials
        </button>
    {/if}

    {#if completedCheckingLiftingCastCredentials}
        {#if areLiftingCastCredentialsValid }
            <p>Meet credentials verified with LiftingCast server.</p>
        {:else}
            <p class="error">Could not successfully verify meet credentials via {credentialCheckUrl}</p>
            <p class="error">Error message: {liftingCastLoginResponse}</p>
        {/if}
    {/if}

    <hr/>

    {#if !meetsPromise}
        <p class="help">Fetch the meets for your LiftingCast server type.</p>
    {:else if meetsPromise && !selectedMeetId}
        <p class="help">Select your meet.</p>
    {:else if platformsPromise && !selectedPlatformId}
        <p class="help">Select your platform.</p>
    {:else if selectedMeetId && selectedPlatformId && !canSubmitConfigurationToDrl}
        <p class="help">Enter your meet password and verify meet credentials before submitting configuration to
            DRL.</p>
    {:else if canSubmitConfigurationToDrl}
        <p class="help">Click button below to configure DRL with your LiftingCast meet and platform info.</p>
    {/if}

    <button
            on:click={sendLiftingCastInfoToDrl}
            disabled={!canSubmitConfigurationToDrl || undefined}
    >
        Configure DRL with meet and platform info
    </button>

    {#if isDrlConfigured}
        <div>
            DRL has been configured
        </div>
    {/if}
</main>

<style>
    main {
        padding: 1em;
        max-width: 240px;
        margin: 0 auto;
    }

    h1 {
        text-transform: uppercase;
        font-size: 4em;
        font-weight: 100;
    }

    hr {
        margin-top: 10px;
        margin-bottom: 20px;
        border: 1px solid #484848;
    }

    .help {
        color: #7fff00;
    }

    .error {
        color: #ff0000;
    }

    @media (min-width: 640px) {
        main {
            max-width: none;
        }
    }
</style>
