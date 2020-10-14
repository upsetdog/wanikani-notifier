const path = require('path');
const notifier = require('node-notifier');
const fetch = require('node-fetch');
const fs = require('fs');
const open = require('open');

const { API_TOKEN } = JSON.parse(fs.readFileSync('./config.json').toString());

function main() {
    setInterval(() => {
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

                    notifier.notify({
                        title: "Wanikani",
                        message: `${count} reviews available!`,
                        icon: path.join(__dirname, 'wk-icon.png'),
                        sound: false,
                        wait: true,
                    }, () => {
                        open('https://www.wanikani.com/review');
                    });
                }
            }).catch(err => {
                console.log(err);
            });
    }, (1000 * 60 * 60));
}

main();