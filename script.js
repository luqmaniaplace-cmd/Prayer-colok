let prayerTimes = {};

const prayerNames = [
  "Imsak",
  "Fajr",
  "Sunrise",
  "Ishraq",
  "Chasht",
  "Zawal",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Awwabin",
  "Isha",
  "Midnight",
  "Last Third"
];

// 12 Hour Format
function format12(time){
  time = time.split(" ")[0];
  let [h,m]=time.split(":");
  h=parseInt(h);
  let ampm=h>=12?"PM":"AM";
  h=h%12;
  if(h==0)h=12;
  return h.toString().padStart(2,'0')+":"+m+" "+ampm;
}

// Clock
function updateClock(){
  let now=new Date();
  let h=now.getHours();
  let m=now.getMinutes();
  let s=now.getSeconds();
  let ampm=h>=12?"PM":"AM";
  h=h%12;if(h==0)h=12;

  document.getElementById("clock").innerHTML=
  h.toString().padStart(2,'0')+":"+
  m.toString().padStart(2,'0')+":"+
  s.toString().padStart(2,'0')+" "+ampm;

  document.getElementById("date").innerHTML=
  now.toDateString()+" | Hijri: "+
  new Intl.DateTimeFormat('en-TN-u-ca-islamic').format(now);
}
setInterval(updateClock,1000);
updateClock();


// ----------- Create Empty Prayer Boxes -----------
function renderInitialPrayers(){

  let html="";

  prayerNames.forEach(name=>{
    html+=`<div class="prayer-row" id="${name}">
      <div class="label">${name}</div>
      <div class="time">--:--</div>
    </div>`;
  });

  // Manual Jamaat Rows
  const manualNames=["fajr","zuhr","asr","maghrib","isha"];

  manualNames.forEach(name=>{
    let saved = localStorage.getItem(name) || "";
    let placeholder;

    switch(name){
      case "fajr": placeholder="05:30"; break;
      case "zuhr": placeholder="01:30"; break;
      case "asr": placeholder="04:45"; break;
      case "maghrib": placeholder="06:15"; break;
      case "isha": placeholder="08:00"; break;
    }

    html+=`
    <div class="manual-row">
      <div class="manual-label">
      ${name==="fajr"?"Fajr":name==="zuhr"?"Zuhr":name==="asr"?"Asr":name==="maghrib"?"Maghrib":"Isha"} Jamaat
      </div>
      <div class="manual-display" id="${name}Display">${saved || placeholder}</div>
      <input type="text" class="manual-hidden" id="${name}J" placeholder="${placeholder}">
    </div>`;
  });

  document.getElementById("prayerTable").innerHTML=html;

  // Manual Save System
  // Manual input persistence
setTimeout(()=>{
  manualNames.forEach(name=>{
    const input = document.getElementById(name+"J");
    const display = document.getElementById(name+"Display");
    if(input && display){
      // پہلے سے saved value دکھائیں
      display.innerText = localStorage.getItem(name) || input.placeholder;

      // input پر change کے ساتھ update
      input.addEventListener("input", ()=>{
        display.innerText = input.value;
        localStorage.setItem(name, input.value);
      });

      // Tap / Click پر focus کرانے کے لیے
      display.addEventListener("click", ()=>{
        input.focus();
      });
    }
  });
},100);
}


// ----------- Update Prayer Times -----------
function renderPrayers(){
  for(let name in prayerTimes){
    let row = document.getElementById(name);
    if(row){
      let timeDiv = row.querySelector(".time");
      timeDiv.innerText = format12(prayerTimes[name]);
    }
  }
}


// GPS
function getLocation(){
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(position=>{
      let lat=position.coords.latitude;
      let lon=position.coords.longitude;
      loadPrayerTimes(lat,lon);
      getCityName(lat,lon);
    });
  }
}


// Load Prayer Times
function loadPrayerTimes(lat,lon){
  fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=1&school=1`)
  .then(res=>res.json())
  .then(data=>{
    let t=data.data.timings;

    let sunrise = t.Sunrise.split(" ")[0];
    let [sh, sm] = sunrise.split(":");
    let sunriseMinutes = parseInt(sh)*60 + parseInt(sm);

    let dhuhr = t.Dhuhr.split(" ")[0];
    let [dh, dm] = dhuhr.split(":");
    let dhuhrMinutes = parseInt(dh)*60 + parseInt(dm);

    let maghrib = t.Maghrib.split(" ")[0];
    let [mh, mm] = maghrib.split(":");
    let maghribMinutes = parseInt(mh)*60 + parseInt(mm);

    function minutesToTime(min){
      let h = Math.floor(min/60);
      let m = min%60;
      return h.toString().padStart(2,'0')+":"+m.toString().padStart(2,'0');
    }

    prayerTimes={
      "Imsak":t.Imsak,
      "Fajr":t.Fajr,
      "Sunrise":t.Sunrise,
      "Ishraq": minutesToTime(sunriseMinutes+12),
      "Chasht": minutesToTime(sunriseMinutes+110),
      "Zawal": minutesToTime(dhuhrMinutes-10),
      "Dhuhr":t.Dhuhr,
      "Asr":t.Asr,
      "Maghrib":t.Maghrib,
      "Awwabin": minutesToTime(maghribMinutes+15),
      "Isha":t.Isha,
      "Midnight":t.Midnight,
      "Last Third":t.Lastthird
    };

    renderPrayers();
  });
}


// City Name
function getCityName(lat,lon){
  fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
  .then(res=>res.json())
  .then(data=>{
    document.getElementById("cityName").innerHTML="Current City: "+data.city;
  });
}


// Active / Next Highlight
function updatePrayerStatus(){

  if(!prayerTimes || Object.keys(prayerTimes).length===0) return;

  let now = new Date();
  let currentMinutes = now.getHours()*60 + now.getMinutes();

  let keys = prayerNames;
  let times = [];
  let previousTime = 0;

  keys.forEach(name=>{
    let time = prayerTimes[name];
    if(!time){
      times.push(null);
      return;
    }

    time = time.split(" ")[0];
    let [h,m] = time.split(":");
    let minutes = parseInt(h)*60 + parseInt(m);

    if(minutes < previousTime){
      minutes += 1440;
    }

    times.push(minutes);
    previousTime = minutes;
  });

  if(currentMinutes < times[0]){
    currentMinutes += 1440;
  }

  keys.forEach(name=>{
    let row = document.getElementById(name);
    if(row){
      row.classList.remove("active","next");
    }
  });

  let activeIndex = 0;

  for(let i=0;i<times.length;i++){
    if(currentMinutes >= times[i]){
      activeIndex = i;
    }
  }

  let nextIndex = activeIndex + 1;
  if(nextIndex >= keys.length){
    nextIndex = 0;
  }

  document.getElementById(keys[activeIndex])?.classList.add("active");
  document.getElementById(keys[nextIndex])?.classList.add("next");
}
setInterval(updatePrayerStatus,1000);


// Start
renderInitialPrayers();
getLocation();
