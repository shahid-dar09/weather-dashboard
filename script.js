// script.js
// Weather App Script
// ========== CONFIG ==========
const API_KEY = "d0c0b94af42ba6623af1d4d1c2d403fa"; // <- put your working key here

// ========== ELEMENTS ==========
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const errorMessage = document.getElementById("error-message");
const loader = document.getElementById("loader");

const currentWeatherSection = document.getElementById("current-weather");
const hourlySection = document.getElementById("hourly-section");
const forecastSection = document.getElementById("forecast-section");
const hourlyList = document.getElementById("hourly-list");
const forecastContainer = document.getElementById("forecast");

const tempEl = document.getElementById("temperature");
const cityEl = document.getElementById("city-name");
const descEl = document.getElementById("description");
const highLowEl = document.getElementById("high-low");
const feelsLikeEl = document.getElementById("feels-like");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const pressureEl = document.getElementById("pressure");
const visibilityEl = document.getElementById("visibility");
const cloudsEl = document.getElementById("clouds");
const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");
const iconEl = document.getElementById("weather-icon");

// ========== HELPERS ==========
function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove("hidden");
}

function clearError() {
    errorMessage.classList.add("hidden");
}

function mpsToKmph(mps) {
    return Math.round(mps * 3.6);
}

function metersToKm(m) {
    return (m / 1000).toFixed(1);
}

function formatTimeFromUnix(timestamp, timezoneOffset) {
    const date = new Date((timestamp + timezoneOffset) * 1000);
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
}

function getDayNameFromUnix(timestamp, timezoneOffset) {
    const date = new Date((timestamp + timezoneOffset) * 1000);
    return date.toLocaleDateString("en-US", {
        weekday: "short"
    });
}

function getHourFromUnix(timestamp, timezoneOffset) {
    const date = new Date((timestamp + timezoneOffset) * 1000);
    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: true
    });
}

function changeBackground(condition, isDay) {
    const body = document.body;

    const classes = [
        "default-bg",
        "sunny",
        "cloudy",
        "rainy",
        "snowy",
        "stormy",
        "misty",
        "night"
    ];

    body.classList.remove(...classes);

    const main = condition.toLowerCase();

    let cls = "default-bg";

    if (!isDay) {
        cls = "night";
    } else if (main.includes("clear")) {
        cls = "sunny";
    } else if (main.includes("cloud")) {
        cls = "cloudy";
    } else if (main.includes("rain") || main.includes("drizzle")) {
        cls = "rainy";
    } else if (main.includes("snow")) {
        cls = "snowy";
    } else if (main.includes("thunder")) {
        cls = "stormy";
    } else if (main.includes("mist") || main.includes("haze") || main.includes("fog") || main.includes("smoke")) {
        cls = "misty";
    }

    body.classList.add(cls);
}

// Pick one forecast per day (around noon)
function processForecastData(list, timezoneOffset) {
    const daily = {};

    list.forEach(item => {
        const date = new Date((item.dt + timezoneOffset) * 1000);
        const dayKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
        const hour = date.getUTCHours();

        const score = Math.abs(12 - hour); // noon preference

        if (!daily[dayKey] || score < daily[dayKey].score) {
            daily[dayKey] = {
                score,
                item
            };
        }
    });

    const days = Object.keys(daily)
        .sort()
        .map(key => daily[key].item);

    return days.slice(0, 5);
}

// ========== API CALLS ==========
async function fetchCurrentWeather(city) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
    )}&appid=${API_KEY}&units=metric`;

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error("City not found or API error");
    }
    return res.json();
}

async function fetchForecast(city) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
        city
    )}&appid=${API_KEY}&units=metric`;

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error("Forecast not available");
    }
    return res.json();
}

// ========== UI UPDATE ==========
function updateCurrentWeatherUI(data) {
    const {
        main,
        name,
        sys,
        weather,
        wind,
        dt,
        timezone,
        visibility,
        clouds
    } = data;

    const condition = weather[0].main;
    const description = weather[0].description;
    const iconCode = weather[0].icon;

    tempEl.textContent = `${Math.round(main.temp)}°C`;
    cityEl.textContent = `${name}, ${sys.country || ""}`;
    descEl.textContent = description
        .split(" ")
        .map(w => w[0].toUpperCase() + w.slice(1))
        .join(" ");

    highLowEl.textContent = `H: ${Math.round(main.temp_max)}°C • L: ${Math.round(main.temp_min)}°C`;
    feelsLikeEl.textContent = `${Math.round(main.feels_like)}°C`;
    humidityEl.textContent = `${main.humidity}%`;
    windEl.textContent = `${mpsToKmph(wind.speed)} km/h`;
    pressureEl.textContent = `${main.pressure} hPa`;
    visibilityEl.textContent = visibility ? `${metersToKm(visibility)} km` : "--";
    cloudsEl.textContent = `${clouds?.all ?? "--"}%`;

    sunriseEl.textContent = formatTimeFromUnix(sys.sunrise, timezone);
    sunsetEl.textContent = formatTimeFromUnix(sys.sunset, timezone);

    iconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    iconEl.alt = condition;

    const isDay = dt >= sys.sunrise && dt <= sys.sunset;
    changeBackground(condition, isDay);

    currentWeatherSection.classList.remove("hidden");
}

function updateHourlyUI(forecastData) {
    const {
        list,
        city
    } = forecastData;

    const timezoneOffset = city.timezone || 0;

    // Next 8 entries (~24 hours, 3h step)
    const hours = list.slice(0, 8);
    hourlyList.innerHTML = "";

    hours.forEach(item => {
        const timeLabel = getHourFromUnix(item.dt, timezoneOffset);
        const iconCode = item.weather[0].icon;
        const description = item.weather[0].description;
        const temp = Math.round(item.main.temp);

        const card = document.createElement("div");
        card.className = "hourly-card";

        card.innerHTML = `
            <div class="hourly-time">${timeLabel}</div>
            <img class="hourly-icon" src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="${description}">
            <div class="hourly-temp">${temp}°C</div>
            <div class="hourly-desc">${description
                .split(" ")
                .map(w => w[0].toUpperCase() + w.slice(1))
                .join(" ")}</div>
        `;

        hourlyList.appendChild(card);
    });

    hourlySection.classList.remove("hidden");
}

function updateForecastUI(forecastData) {
    const {
        list,
        city
    } = forecastData;

    const timezoneOffset = city.timezone || 0;

    const processed = processForecastData(list, timezoneOffset);
    forecastContainer.innerHTML = "";

    processed.forEach(item => {
        const dayName = getDayNameFromUnix(item.dt, timezoneOffset);
        const iconCode = item.weather[0].icon;
        const description = item.weather[0].description;
        const minTemp = Math.round(item.main.temp_min);
        const maxTemp = Math.round(item.main.temp_max);

        const card = document.createElement("div");
        card.className = "forecast-card";

        card.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <img class="forecast-icon" src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="${description}">
            <div class="forecast-temp">
                <span>${maxTemp}°C</span>
                <span style="color: rgba(255,255,255,0.7)">/</span>
                <span style="color: rgba(255,255,255,0.7)">${minTemp}°C</span>
            </div>
        `;

        forecastContainer.appendChild(card);
    });

    forecastSection.classList.remove("hidden");
}

// ========== MAIN FLOW ==========
async function handleSearch(cityFromClick) {
    const city = cityFromClick || searchInput.value.trim();
    if (!city) {
        showError("Please enter a city name.");
        return;
    }

    clearError();
    currentWeatherSection.classList.add("hidden");
    hourlySection.classList.add("hidden");
    forecastSection.classList.add("hidden");

    loader.classList.remove("hidden");

    try {
        const [current, forecast] = await Promise.all([
            fetchCurrentWeather(city),
            fetchForecast(city)
        ]);

        updateCurrentWeatherUI(current);
        updateHourlyUI(forecast);
        updateForecastUI(forecast);
    } catch (err) {
        console.error(err);
        showError(err.message || "Something went wrong. Try again.");
    } finally {
        loader.classList.add("hidden");
    }
}

// ========== EVENTS ==========
searchBtn.addEventListener("click", () => handleSearch());

searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        handleSearch();
    }
});

document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
        const city = chip.getAttribute("data-city");
        searchInput.value = city;
        handleSearch(city);
    });
});

// Load default city on start
window.addEventListener("DOMContentLoaded", () => {
    searchInput.value = "Anantnag";
    handleSearch("Anantnag");
});
