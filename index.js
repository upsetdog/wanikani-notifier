const { UUIDv4 } = require('uuid-v4-validator');
const notifier = require('node-notifier');
const colors = require('colors');
const fetch = require('node-fetch');
const open = require('open');
const path = require('path');

const { API_TOKEN, refreshRate, playSound, minReview } = require("./config.json");
console.log(colors.yellow(`[+] - loaded config file`));


function sleep(ms) {
    console.log(colors.yellow(`[+] - sleeping for ${ms} ms`));
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function getReviewCount() {
    console.log(colors.yellow(`[+] - checking for reviews`));
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

                    return resolve(count);
                }

                return resolve(0);
            })
            .catch(err => reject(err));
    });
}

function sendNotification(reviewCount) {
    console.log(colors.yellow(`[+] - sending notification`));
    notifier.notify({
        title: "Wanikani",
        message: `${reviewCount} reviews available!`,
        icon: path.join(__dirname, 'wk-icon.png'),
        sound: playSound,
        wait: true,
        actions: ['Go to reviews']
    });
}

async function main() {
    if (UUIDv4.validate(API_TOKEN) === false) {
        console.log(colors.red(`[+] - invalid API token`));
        return;
    }

    notifier.on('Go to reviews', () => {
        open('https://www.wanikani.com/reviews');
    });

    while (true) {
        var reviewCount = await getReviewCount();

        if (reviewCount > minReview) {
            console.log(colors.green(`[+] - # ${reviewCount} reviews found`));
            sendNotification(reviewCount);
        } else {
            console.log(colors.grey(`[+] - ${reviewCount == 0 ? 'no' : 'not enough'} reviews found`));
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
