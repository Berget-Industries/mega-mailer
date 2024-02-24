const nodemailer = require("nodemailer");

const config1 = {
  service: "hotmail",
  auth: {
    user: "riksmuff1234@outlook.com",
    pass: "dlcxfstzlxoaxony",
  },
};

const config2 = {
  service: "gmail",
  auth: {
    user: "bergetindustries@gmail.com",
    pass: "nxha vdch kryb xcgo",
  },
};

const usedConfig = config2;

let transporter = nodemailer.createTransport(usedConfig);

const examples = [
  "Hej, jag behöver dränering av min källare, ytan är ca 150 kvadratmeter.",
  "Vi söker någon för grundläggning av en villa på cirka 200 kvadratmeter.",
  "Behöver hjälp med markarbete för en uppfart, ungefär 300 kvadratmeter stor.",
  "Kan ni erbjuda snöröjning för vår parkeringsplats på ca 500 kvadratmeter?",
  "Jag är intresserad av tomtplanering för en yta på 1000 kvadratmeter.",
  "Vi behöver trädgårdsanläggning för vår 2000 kvadratmeter stora tomt.",
  "Behöver en offert för dränering runt mitt hus, ytan är cirka 250 kvadratmeter.",
  "Söker expert för grundläggning av mitt garage, ytan är ungefär 400 kvadratmeter.",
  "Önskar hjälp med markarbete för en ny trädgård, storleken är ca 350 kvadratmeter.",
  "Vi behöver snöröjningstjänster för en innergård, cirka 600 kvadratmeter.",
  "Jag planerar att planera om min tomt, ytan är ungefär 1200 kvadratmeter.",
  "Kan ni hjälpa till med trädgårdsanläggning för en yta på 1800 kvadratmeter?",
  "Vill ha en offxert för dräneringsarbete på en yta av 200 kvadratmeter.",
  "Jag söker någon för grundläggning av en utbyggnad, ca 500 kvadratmeter.",
  "Behöver assistans med markarbete för en lekplats, ytan är 450 kvadratmeter.",
  "Kan ni sköta snöröjning av en gångväg på ungefär 700 kvadratmeter?",
  "Önskar hjälp med tomtplanering för mitt sommarställe, ytan är 1500 kvadratmeter.",
  "Vi behöver professionell trädgårdsanläggning för en yta på 1600 kvadratmeter.",
  "Söker någon som kan utföra dränering av en terrass, ca 180 kvadratmeter.",
  "Jag behöver grundläggning för en altan, ytan är omkring 300 kvadratmeter.",
  "Vi vill ha hjälp med markarbete för en parkeringsplats, ca 400 kvadratmeter.",
  "Behöver snöröjning för en uppfart på cirka 800 kvadratmeter.",
  "Kan ni erbjuda tomtplanering för en yta av 2000 kvadratmeter?",
  "Vi söker trädgårdsanläggning för en villa på ungefär 1700 kvadratmeter.",
  "Hej, jag behöver dränera en gångväg runt mitt hus, ca 100 kvadratmeter.",
  "Jag vill ha en offert för grundläggning av en ny trädgård, 600 kvadratmeter.",
  "Önskar assistans med markarbete för en altan, storleken är ca 550 kvadratmeter.",
  "Vi behöver någon som kan sköta snöröjning av en väg, cirka 900 kvadratmeter.",
  "Jag är intresserad av att planera om min framsida, ytan är ungefär 1300 kvadratmeter.",
  "Kan ni hjälpa till med trädgårdsanläggning för en park, ca 1900 kvadratmeter?",
];

function getRandomMessage() {
  const randomIndex = Math.floor(Math.random() * examples.length);
  return examples[randomIndex];
}

function getRandomSubject() {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 24; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  return result;
}

// Skicka e-post

let count = 0;
const send = () => {
  let mailOptions = {
    from: `Alex <${usedConfig.auth.user}>`,
    to: usedConfig.service === "gmail" ? config1.auth.user : config2.auth.user,
    // subject: "",
    // text: "Jag vill boka ett bord för två personer ikväll.",
    text: getRandomMessage(),
    subject: getRandomSubject(),
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      clearInterval(interval);
      process.exit(1);
    } else {
      count++;
      console.log(
        `Email number ${count} sent to ${mailOptions.to} with subject: ${mailOptions.subject}`
      );
    }
  });
};

const interval = setInterval(() => {
  send();
}, 1000 * 3);

send();
