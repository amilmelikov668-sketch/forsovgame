
const API_BASE_URL = "https://your-api-domain.com"; // замени на свой домен API

let tg = null;
let user = null;
let balance = 0;

const bombsSelect = document.getElementById("bombs");
const amountInput = document.getElementById("amount");
const balanceEl = document.getElementById("balance");
const lastWinEl = document.getElementById("lastWin");
const lastMultEl = document.getElementById("lastMult");
const playBtn = document.getElementById("playBtn");
const userChip = document.getElementById("userChip");
const themeToggle = document.getElementById("themeToggle");
const gridEl = document.getElementById("grid");

let theme = localStorage.getItem("theme") || "dark";

function applyTheme() {
    if (theme === "light") {
        document.body.classList.add("light");
        themeToggle.textContent = "🌞";
    } else {
        document.body.classList.remove("light");
        themeToggle.textContent = "🌓";
    }
    localStorage.setItem("theme", theme);
}

themeToggle.addEventListener("click", () => {
    theme = theme === "light" ? "dark" : "light";
    applyTheme();
});

function initTelegram() {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();

        user = tg.initDataUnsafe.user;
        if (user) {
            userChip.textContent = user.username
                ? "@" + user.username
                : user.first_name || "Игрок";
            registerUser();
            fetchBalance();
        }
    } else {
        // DEBUG MODE вне Telegram
        user = { id: 123456, username: "debug_user" };
        userChip.textContent = "@debug_user";
        registerUser();
        fetchBalance();
    }
}

async function registerUser() {
    if (!user) return;
    try {
        await fetch(API_BASE_URL + "/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tg_id: user.id,
                username: user.username || null,
            }),
        });
    } catch (e) {
        console.error("register error", e);
    }
}

async function fetchBalance() {
    if (!user) return;
    try {
        const res = await fetch(
            API_BASE_URL + "/balance?tg_id=" + encodeURIComponent(user.id)
        );
        const data = await res.json();
        balance = data.balance || 0;
        renderBalance();
    } catch (e) {
        console.error("balance error", e);
    }
}

function renderBalance() {
    balanceEl.textContent = balance.toFixed(2) + " M";
}

async function placeBet() {
    if (!user) return;

    const amount = Number(amountInput.value || "0");
    const bombs = Number(bombsSelect.value || "3");

    if (amount <= 0) {
        alert("Введите корректную ставку");
        return;
    }
    if (amount > balance) {
        alert("Недостаточно средств");
        return;
    }

    playBtn.disabled = true;
    playBtn.textContent = "Играем...";

    try {
        const res = await fetch(API_BASE_URL + "/bet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tg_id: user.id,
                amount,
                bombs,
            }),
        });
        const data = await res.json();

        if (data.error) {
            alert("Ошибка: " + data.error);
        } else {
            balance = data.new_balance;
            renderBalance();
            lastWinEl.textContent = data.win.toFixed(2) + " M";
            lastMultEl.textContent = data.mult.toFixed(2) + " X";

            revealRandomCells(data.mult);
        }
    } catch (e) {
        console.error("bet error", e);
        alert("Ошибка соединения с сервером");
    } finally {
        playBtn.disabled = false;
        playBtn.textContent = "🚀 Начать игру";
    }
}

function revealRandomCells(mult) {
    const cells = Array.from(document.querySelectorAll(".cell"));
    cells.forEach((c) => {
        c.classList.remove("open-win", "open-bomb");
        const label = c.querySelector(".cell-label");
        if (label) c.removeChild(label);
    });

    const bombsCount = Number(bombsSelect.value || "3");
    const indices = [...Array(cells.length).keys()];
    shuffle(indices);

    const bombIndices = new Set(indices.slice(0, bombsCount));
    cells.forEach((cell, idx) => {
        const label = document.createElement("div");
        label.className = "cell-label";

        if (bombIndices.has(idx)) {
            cell.classList.add("open-bomb");
            label.textContent = "💣";
        } else {
            cell.classList.add("open-win");
            label.textContent = "💎";
        }
        cell.appendChild(label);
    });
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function buildGrid() {
    gridEl.innerHTML = "";
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        gridEl.appendChild(cell);
    }
}

function initBetButtons() {
    document.querySelectorAll(".bet-buttons button").forEach((btn) => {
        btn.addEventListener("click", () => {
            const act = btn.dataset.act;
            let current = Number(amountInput.value || "0");

            if (act === "min") current = 1;
            if (act === "x2") current = Math.min(current * 2 || 2, balance);
            if (act === "max") current = balance || 1;

            amountInput.value = Math.max(1, Math.floor(current));
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    applyTheme();
    buildGrid();
    initBetButtons();
    playBtn.addEventListener("click", placeBet);
    initTelegram();
});
