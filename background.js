function mToMs(m) {
    return m * 60 * 1000
}

const DENIED = false
const ALLOWED = true
const INTERVAL = 1000
const INTERVAL_MULTIPLIER = 1 // Mostly for testing
const STATE = {}

const WEBSITES = {
    'youtube\\.com': {
        access: DENIED,
        allowed: [
            '/c/',
            '/(watch|channel|user|playlist|results|account|@)',
            '/feed/(channels|library|history)'
        ],
        denied: [],
        isTimeLimitEnabled: false,
        defaultTimeLimit: 0,
        elementBlocker: () => {
            const elements = document.querySelectorAll('#columns #secondary #related, ytd-topbar-logo-renderer, ytd-notification-topbar-button-renderer, ytd-mini-guide-renderer, #owner #subscribe-button')

            for (const element of elements) {
                element.innerHTML = ''
            }

            const navButtons = document.querySelectorAll('ytd-guide-section-renderer:first-child .style-scope.ytd-guide-section-renderer#items ytd-guide-entry-renderer')

            for (let a = 0; a < 4; ++a) {
                const navButton = navButtons[a]

                if (navButton) {
                    navButton.innerHTML = ''
                }
            }
        }
    },
    'twitter\\.com': {
        access: DENIED,
        allowed: [
            '/[a-zA-Z0-9_-]+',
        ],
        denied: [
            '/explore'
        ],
        isTimeLimitEnabled: true,
        timeLimitScope: ALLOWED,
        defaultTimeLimit: mToMs(20),
        elementBlocker: () => {
            const element = document.querySelector('[data-testid="sidebarColumn"]')

            if (element) {
                element.innerHTML = ''
            }
        }
    },
    'twitch\\.tv': {
        access: DENIED,
        allowed: [],
        denied: [],
        isTimeLimitEnabled: false,
        defaultTimeLimit: 0,
        elementBlocker: url => {}
    },
    'tiktok\\.com': {
        access: DENIED,
        allowed: [],
        denied: [],
        isTimeLimitEnabled: false,
        defaultTimeLimit: 0,
        elementBlocker: url => {}
    },
    'nitter\\.net': {
        access: DENIED,
        allowed: [],
        denied: [],
        isTimeLimitEnabled: false,
        defaultTimeLimit: 0,
        elementBlocker: url => {}
    },
    'reddit\\.com': {
        access: DENIED,
        allowed: [],
        denied: [],
        isTimeLimitEnabled: true,
        timeLimitScope: DENIED,
        defaultTimeLimit: mToMs(10),
        elementBlocker: url => {}
    },
    'instagram\\.com': {
        access: DENIED,
        allowed: [],
        denied: [],
        isTimeLimitEnabled: false,
        defaultTimeLimit: 0,
        elementBlocker: url => {}
    },
    'jstris\\.jezevec10\\.com': {
        access: DENIED,
        allowed: [],
        denied: [],
        isTimeLimitEnabled: false,
        defaultTimeLimit: 0,
        elementBlocker: url => {}
    }
}

function blockPage(url) {
    if (url.includes('youtube.com')) {
        document.body.innerHTML = ''
        window.location.pathname = '/results'
    } else {
        document.body.innerHTML = '<div style="font-size: 72px; height: 100vh; display: flex; justify-content: center; align-items: center;">STOP WASTING TIME DUMBASS!</div>'
    }
}

function formatTime(ms) {
    const date = new Date(0)
    date.setMilliseconds(ms)

    const hours = date.getUTCHours()
    const minutes = date.getUTCMinutes()
    const seconds = date.getUTCSeconds()

    if (!hours && !minutes) {
        return `${ seconds }`
    }

    return `${ hours }:${ minutes }`
}

function reset(state) {
    state.tabId = null
    state.url = ''
    state.key = ''
    state.limit = 0
    state.time = 0
    state.timer = null
}

async function resetLimits(force = false) {
    const key = 'LAST_DAY'
    const data = await chrome.storage.local.get(key)
    const value = data[key] || 0
    const today = new Date().getUTCDay()

    console.log(value, today)

    if (value != today || force) {
        for (const a in WEBSITES) {
            if (WEBSITES[a].isTimeLimitEnabled) {
                await chrome.storage.local.set({ [a]: 0 })
            }
        }

        data[key] = today
        await chrome.storage.local.set(data)
    }
}

async function updateTime(key, time) {
    const data = await chrome.storage.local.get(key)
    const value = data[key] || 0
    data[key] = time > value ? time : value
    await chrome.storage.local.set(data)
}

function interval() {
    STATE.time += INTERVAL * INTERVAL_MULTIPLIER

    if (STATE.time >= STATE.limit) {
        clearInterval(STATE.timer)
        chrome.scripting.executeScript({
            target: { tabId: STATE.tabId },
            function: blockPage,
            args: [STATE.url]
        })
        chrome.action.setBadgeText({ text: '' });
    } else {
        console.log(STATE.time)
        chrome.action.setBadgeText({ text: STATE.timer ? formatTime(STATE.limit - STATE.time) : '' });
    }
}

function blockPageScript(tab) {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: blockPage,
        args: [tab.url]
    })
}

function processTimer(tab, key, website) {
    if (!STATE.timer) {
        STATE.key = key
        STATE.tabId = tab.id
        STATE.url = tab.url

        chrome.storage.local.get(key, data => {
            const value = data[key] || 0
            STATE.time = value
            STATE.limit = website.defaultTimeLimit

            if (STATE.time >= STATE.limit) {
                blockPageScript(tab)
            } else {
                STATE.timer = setInterval(interval, INTERVAL);
            }
        })
    }
}

function isDeniedDenied(tab, key, website) {
    return website.access === DENIED && !website.allowed.some(a => new RegExp(key + a).test(tab.url))
}

function isAllowedDenied(tab, key, website) {
    return website.access === ALLOWED && website.denied.some(a => new RegExp(key + a).test(tab.url))
}

function blockWebsite(tab) {
    for (const key in WEBSITES) {
        if (new RegExp(key).test(tab.url)) {
            const website = WEBSITES[key]

            if (isDeniedDenied(tab, key, website) || isAllowedDenied(tab, key, website)) {
                if (website.isTimeLimitEnabled && website.timeLimitScope === DENIED) {
                    processTimer(tab, key, website)
                } else {
                    blockPageScript(tab)
                }
            } else {
                if (website.isTimeLimitEnabled && website.timeLimitScope === ALLOWED) {
                    processTimer(tab, key, website)
                }

                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: website.elementBlocker,
                    args: [tab.url]
                })
            }

            break;
        }
    }
}

function onActivated(activeInfo) {
    resetLimits()

    if (STATE.timer) {
        clearInterval(STATE.timer)
        updateTime(STATE.key, STATE.time)
        reset(STATE)
        chrome.action.setBadgeText({ text: '' });
    }

    chrome.tabs.get(activeInfo.tabId, tab => {
        blockWebsite(tab)
    })
}

function onCommitted(details) {
    if (details.transitionType === 'reload') {
        chrome.tabs.get(details.tabId, tab => {
            if (tab.active) {
                blockWebsite(tab)
            }
        })
    }
}

function onUpdated(_, changeInfo, tab) {
    if (
        tab.active &&
        changeInfo.hasOwnProperty('url') &&
        changeInfo.status === 'loading'
    ) {
        blockWebsite(tab)
    }
}

chrome.tabs.onActivated.addListener(onActivated)

chrome.webNavigation.onCommitted.addListener(onCommitted)

chrome.tabs.onUpdated.addListener(onUpdated)

// For keeping service worker alive, need to refactor code

let lifeline;

keepAlive();

chrome.runtime.onConnect.addListener(port => {
    if (port.name === 'keepAlive') {
        lifeline = port;
        setTimeout(keepAliveForced, 295e3); // 5 minutes minus 5 seconds
        port.onDisconnect.addListener(keepAliveForced);
    }
});

function keepAliveForced() {
    lifeline?.disconnect();
    lifeline = null;
    keepAlive();
}

async function keepAlive() {
    if (lifeline) return;
        for (const tab of await chrome.tabs.query({ url: '*://*/*' })) {
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: () => chrome.runtime.connect({ name: 'keepAlive' }),
                    // `function` will become `func` in Chrome 93+
                });
                chrome.tabs.onUpdated.removeListener(retryOnTabUpdate);
                return;
            } catch (e) {}
        }
    chrome.tabs.onUpdated.addListener(retryOnTabUpdate);
}

async function retryOnTabUpdate(tabId, info, tab) {
    if (info.url && /^(file|https?):/.test(info.url)) {
        keepAlive();
    }
}