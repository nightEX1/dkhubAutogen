const gradient = require('gradient-string');
const readlineSync = require('readline-sync');
const cluster = require('cluster');
const puppeteer = require('puppeteer');
const generator = require('generate-password');
const fs = require('fs');

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
const days = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15',
    '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26'];
const years = ['2003', '2002', '2001', '2000', '1999', '1998', '1997', '1996'];

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

function random_item(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function writedingAccount(username, password, cookie) {
    fs.writeFileSync("data/cookies.txt", `${cookie}\r\n`, { flag: 'a' });
    fs.writeFileSync("data/user-pass.txt", `${username}:${password}\r\n`, { flag: 'a' });
    console.log("✅ บันทึกไฟล์เรียบร้อย!");
}

async function runPuppeteer(roundNumber, usernameInput) {
    console.log(`🚀 เริ่มรอบที่ ${roundNumber}`);
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://www.roblox.com/th/CreateAccount', { waitUntil: "load", timeout: 60000 });
    await page.setViewport({ width: 1920, height: 1080 });

    // เลือกวันเกิด
    await page.select('#MonthDropdown', random_item(months));
    await page.select('#DayDropdown', random_item(days));
    await page.select('#YearDropdown', random_item(years));

    let genUsername = usernameInput + generator.generate({ length: 7, numbers: true });
    const genpassword = generator.generate({ length: 7, numbers: true }) + genUsername;

    await page.type('#signup-username', genUsername);
    await page.type('#signup-password', genpassword);

    // ✅ แก้ไขส่วนตรวจสอบ username (ใช้ selector ตามที่ console.log แสดง)
    const validationElement = await page.$('#signup-usernameInputValidation');
    if (validationElement) {
        const alert = await (await validationElement.getProperty('textContent')).jsonValue();
        if (alert.includes("ชื่อผู้ใช้ถูกใช้งานไปแล้ว") || 
            alert.includes("ชื่อผู้ใช้ไม่ถูกต้อง") || 
            alert.includes("ชื่อผู้ใช้สามารถประกอบด้วยตัวอักษร") || 
            alert.includes("This username is already in use") || 
            alert.includes("Username not appropriate")) {
            
            genUsername = usernameInput + generator.generate({ length: 5, numbers: true });
            await page.type('#signup-username', genUsername);
        }
    }

    await delay(1500);
    await page.click('#MaleButton').catch(() => console.log('⚠️ Click MaleButton error'));
    await delay(1000);
    await page.click('#signup-button');

    try {
        await page.waitForSelector('.game-home-page-container', { timeout: 450000 });
        
        const getCookie = await page.cookies();
        const cookie = getCookie.find(c => c.name === ".ROBLOSECURITY");
        
        if (cookie) {
            writedingAccount(genUsername, genpassword, cookie.value);
            console.log(`🎉 รอบที่ ${roundNumber} สำเร็จ!`);
        } else {
            console.log(`❌ ไม่พบ cookie ในรอบ ${roundNumber}`);
        }
    } catch (err) {
        console.error(`❌ รอบ ${roundNumber} error:`, err.message);
    }

    await browser.close();
    console.log(`🏁 จบรอบที่ ${roundNumber}`);
}

if (cluster.isMaster) {
    console.clear();
    console.log(gradient('white', 'gray').multiline([
        "DevBy: ZEMONNUB \n",
        "/> Roblox Account Generator v.2 </ \n",
        "GitHub: https://github.com/Teemo4621 \n"
    ].join('\n')));
    console.log(gradient.cristal('Discord: ZEMONNUB'));

    const logo = gradient('orange', 'yellow').multiline([
        "███████╗███████╗███╗░░░███╗░█████╗░███╗░░██╗",
        "╚════██║██╔════╝████╗░████║██╔══██╗████╗░██║",
        "░░███╔═╝█████╗░░██╔████╔██║██║░░██║██╔██╗██║",
        "██╔══╝░░██╔══╝░░██║╚██╔╝██║██║░░██║██║╚████║",
        "███████╗███████╗██║░╚═╝░██║╚█████╔╝██║░╚███║",
        "╚══════╝╚══════╝╚═╝░░░░░╚═╝░╚════╝░╚═╝░░╚══╝"
    ].join('\n'));
    console.log(logo + '\n');

    const loop = readlineSync.questionInt("จำนวนรอบ (Rounds) : ");
    const usernamePrefix = readlineSync.question("Prefix username (เช่น Zemon_) : ");

    for (let i = 0; i < loop; i++) {
        cluster.fork({ roundNumber: i + 1, usernameInput: usernamePrefix });
    }

    cluster.on('exit', (worker, code) => {
        console.log(`Worker ${worker.process.pid} จบ (Code: ${code})`);
    });

} else {
    const roundNumber = parseInt(process.env.roundNumber);
    const usernameInput = process.env.usernameInput;
    
    runPuppeteer(roundNumber, usernameInput)
        .catch(err => console.error(`Error worker ${process.pid}:`, err))
        .finally(() => process.exit(0));
}
