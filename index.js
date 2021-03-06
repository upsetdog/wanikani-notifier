const { UUIDv4 } = require('uuid-v4-validator');
const notifier = require('node-notifier');
const colors = require('colors');
const fetch = require('node-fetch');
const open = require('open');
const path = require('path');

const { API_TOKEN, refreshRate, playSound, minReview } = require("./config.json");
console.log(colors.yellow(`[*] loaded config file`));


function formatToTimeFromMs(s) {
    function pad(n, z) {
        z = z || 2;
        return ('00' + n).slice(-z);
    }

    var ms = s % 1000;
    s = (s - ms) / 1000;
    var secs = s % 60;
    s = (s - secs) / 60;
    var mins = s % 60;
    var hrs = (s - mins) / 60;

    return pad(hrs) + 'h ' + pad(mins) + 'm ' + pad(secs) + 's';
}

function sleep(ms) {
    console.log(colors.yellow(`[*] sleeping for ${formatToTimeFromMs(ms)}`));
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function getReviewCount() {
    console.log(colors.yellow(`[*] checking for reviews`));
    return new Promise((resolve, reject) => {
        fetch(`https://api.wanikani.com/v2/summary`, {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:81.0) Gecko/20100101 Firefox/81.0",
                "Authorization": `Bearer ${API_TOKEN}`
            }
        })
            .then(res => res.json())
            .then(json => {
                const now = new Date();
                const nextReviews = new Date(json.data.next_reviews_at);

                if (nextReviews.getTime() - now.getTime() < 0) {
                    const count = json.data.reviews[0].subject_ids.length;
                    const nextHour = json.data.reviews[1].subject_ids.length;

                    return resolve({ count, nextHour });
                }

                return resolve({ count: 0, nextHour: 0 });
            })
            .catch(err => reject(err));
    });
}

function sendNotification(reviewCount, str) {
    console.log(colors.yellow(`[*] sending notification`));
    notifier.notify({
        title: "Wanikani",
        message: str,
        icon: path.join(__dirname, 'wk-icon.png'),
        sound: playSound,
        wait: true,
        actions: ['Go to reviews']
    });
}

async function main() {
    if (!UUIDv4.validate(API_TOKEN)) {
        console.log(colors.red(`[-] invalid API token`));
        return;
    }

    notifier.on('go to reviews', () => {
        open('https://www.wanikani.com/review/session');
    });

    while (true) {
        var reviews = await getReviewCount();
        var reviewCount = reviews.count;
        var reviewCountNextHour = reviewCount.nextHour;

        if (reviewCount > minReview) {
            console.log(colors.green(`[+] # ${reviewCount} reviews found`));
            sendNotification(reviewCount, `${reviewCount} reviews available${reviewCountNextHour > 0 ? ' and 10 more in an hour' : ''}`);
        } else {
            console.log(colors.grey(`[!] ${reviewCount == 0 ? 'no' : 'not enough'} reviews found`));
        }

        var now = new Date();
        var then = new Date();
        then.setHours(now.getHours() + refreshRate);
        then.setMinutes(2, 0, 0);

        var waitTime = then.getTime() - now.getTime();

        await sleep(waitTime);
    }
}

main();
