const hangs = [
    { name: "4 Finger Chisel/Open", category: "Half Crimp", totalReps: 6 },
    { name: "Open 3", category: "Half Crimp", totalReps: 6 },
    { name: "Front Two Open", category: "Half Crimp", totalReps: 2 },
    { name: "Middle Two Open", category: "Half Crimp", totalReps: 2 },
    { name: "Front Two Half Crimp", category: "Half Crimp", totalReps: 2 },
    { name: "Middle Two Half Crimp", category: "Half Crimp", totalReps: 2 }
];

const TOTAL_HANGS = hangs.length;

let currentHangIndex = 0;
let currentRep = 1;
let timeRemaining = 5;
let timer = null;
let isRunning = false;
let phase = 'hang5s';
let completedReps = {};
let wasRunningBeforeHidden = false;

// Configurable times (defaults: 7s hang, 20s rest)
let hangTime = 7;
let restTime = 20;

// Auto continue setting
let autoContinue = false;

// Timestamp for delayed set-dots transition during rest period
let restDotsTransitionTime = 0;

// Sound enabled setting
let soundEnabled = false;

// Web Audio API state
let audioContext = null;
let gainNode = null;
let audioBuffers = {};
let activeSource = null;
let sourceStartTime = 0;
let sourceOffset = 0;
let selectedSound = 'Short Beep Countdown.mp3';
let volume = 1.0;
let preloadedArrayBuffer = null;

// Cache DOM elements
let elements = {};

function cacheElements() {
    elements = {
        exerciseImage: document.getElementById('exercise-image'),
        exerciseName: document.getElementById('exercise-name'),
        setsBadge: document.getElementById('sets-badge'),
        durationBadge: document.getElementById('duration-badge'),
        hangNumberOverlay: document.getElementById('hang-number-overlay'),
        phaseInstruction: document.getElementById('phase-instruction'),
        timerDisplay: document.getElementById('timer-display'),
        setDots: document.getElementById('set-dots'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        playBtn: document.getElementById('play-btn'),
        pauseBtn: document.getElementById('pause-btn'),
        toast: document.getElementById('toast')
    };
    elements.autoContinueToggle = document.getElementById('auto-continue-toggle');
}

function saveWorkoutLog() {
    const totalCompletedReps = Object.values(completedReps).reduce((sum, reps) => {
        return sum + reps.filter(Boolean).length;
    }, 0);

    const totalReps = hangs.reduce((sum, hang) => sum + hang.totalReps, 0);

    const log = {
        completedAt: new Date().toISOString(),
        hangName: "Daily Routine",
        totalReps: totalReps,
        completedReps: totalCompletedReps
    };

    try {
        const stored = localStorage.getItem('abrahangs_logs');
        const logs = stored ? JSON.parse(stored) : [];
        logs.push(log);
        localStorage.setItem('abrahangs_logs', JSON.stringify(logs));
    } catch (e) {
        console.warn('Failed to save workout log:', e);
    }
}

function showToast(message, duration = 2000) {
    const toast = elements.toast;
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

function goToHistory() {
    window.location.href = 'history.html';
}

function initCompletedReps() {
    completedReps = {};
    hangs.forEach((hang, index) => {
        completedReps[index] = Array(hang.totalReps).fill(false);
    });
}

function updateUI() {
    const hang = hangs[currentHangIndex];

    // Determine which hang's image to display
    let displayIndex = currentHangIndex;
    if (autoContinue && phase === 'rest' && currentHangIndex < TOTAL_HANGS - 1 && currentRep >= hangs[currentHangIndex].totalReps) {
        const elapsed = Date.now() - restDotsTransitionTime;
        if (elapsed >= 1500) {
            displayIndex = currentHangIndex + 1;
        }
    }

    // Update exercise image
    if (elements.exerciseImage) {
        elements.exerciseImage.src = `pictures/Hang ${displayIndex + 1}.JPG`;
    }

    // Update exercise info
    const displayHang = hangs[displayIndex];
    if (elements.exerciseName) {
        elements.exerciseName.textContent = displayHang.name;
    }
    if (elements.setsBadge) {
        elements.setsBadge.textContent = `${hang.totalReps} sets`;
    }
    if (elements.durationBadge) {
        elements.durationBadge.textContent = `${hangTime}s per hang`;
    }

    // Update phase instruction
    if (elements.phaseInstruction) {
        if (phase === 'hang5s') {
            elements.phaseInstruction.textContent = 'Get ready!';
        } else if (phase === 'hang7s') {
            elements.phaseInstruction.textContent = 'Hang';
        } else {
            elements.phaseInstruction.textContent = 'Rest';
        }
    }

    // Update hang number overlay
    if (elements.hangNumberOverlay) {
        elements.hangNumberOverlay.textContent = displayIndex + 1;
    }

    // Update timer display
    if (elements.timerDisplay) {
        elements.timerDisplay.textContent = Math.ceil(timeRemaining);
        if (phase === 'hang7s') {
            elements.timerDisplay.classList.add('green');
        } else {
            elements.timerDisplay.classList.remove('green');
        }
    }

    // Update set dots
    if (elements.setDots) {
        const fragment = document.createDocumentFragment();
        // During rest period with autoContinue, delay dots transition by 1.5s
        // so the user can see they've completed the current hang's reps
        let dotsIndex = displayIndex;
        if (autoContinue && phase === 'rest' && displayIndex > currentHangIndex) {
            const elapsed = Date.now() - restDotsTransitionTime;
            if (elapsed < 1500) {
                dotsIndex = currentHangIndex;
            }
        }
        const dotsHang = hangs[dotsIndex];
        for (let i = 1; i <= dotsHang.totalReps; i++) {
            const dot = document.createElement('div');
            dot.className = 'set-dot';
            if (completedReps[dotsIndex][i - 1]) {
                dot.classList.add('completed');
                dot.textContent = i;
            } else if (i === currentRep && (phase === 'hang7s' || phase === 'hang5s')) {
                dot.classList.add('current');
                dot.textContent = i;
            }
            fragment.appendChild(dot);
        }
        elements.setDots.innerHTML = '';
        elements.setDots.appendChild(fragment);
    }

    // Update navigation buttons
    if (elements.prevBtn) {
        elements.prevBtn.disabled = currentHangIndex === 0;
    }
    if (elements.nextBtn) {
        elements.nextBtn.disabled = currentHangIndex === TOTAL_HANGS - 1;
    }

    // Update control buttons
    if (elements.playBtn) {
        elements.playBtn.disabled = isRunning;
    }
    if (elements.pauseBtn) {
        elements.pauseBtn.disabled = !isRunning;
    }
}

function play() {
    if (!isRunning) {
        isRunning = true;
        ensureAudioContext();
        initAudioSession();
        audioContext.resume();
        unlockAudioContext();
        loadAudioBuffer();
        runTimer();
        requestWakeLock();
        if ((phase === 'hang5s' || phase === 'rest') && timeRemaining <= COUNTDOWN_START_AT && timeRemaining > 0) {
            resumeCountdownAudio();
        }
        updateUI();
    }
}

function pause() {
    if (isRunning) {
        clearInterval(timer);
        timer = null;
        isRunning = false;
        releaseWakeLock();
        pauseCountdownAudio();
        updateUI();
    }
}

function stop() {
    clearInterval(timer);
    timer = null;
    isRunning = false;
    releaseWakeLock();
    stopCountdownAudio();
    currentHangIndex = 0;
    currentRep = 1;
    phase = 'hang5s';
    timeRemaining = 5;
    initCompletedReps();
    updateUI();
}

function runTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
        if (timeRemaining > 0) {
            timeRemaining -= 1;
            if (timeRemaining === COUNTDOWN_START_AT && (phase === 'hang5s' || phase === 'rest' || phase === 'hang7s')) {
                startCountdownAudio();
            }
            updateUI();
        } else {
            advancePhase();
        }
    }, 1000);
}

function advancePhase() {
    switch (phase) {
        case 'hang5s':
            phase = 'hang7s';
            timeRemaining = hangTime;
            stopCountdownAudio();
            break;
        case 'hang7s':
            completedReps[currentHangIndex][currentRep - 1] = true;
            if (currentHangIndex === TOTAL_HANGS - 1 && currentRep === hangs[currentHangIndex].totalReps) {
                clearInterval(timer);
                timer = null;
                isRunning = false;
                saveWorkoutLog();
                showToast("You've finished hanging! Session logged.", 4000);
                setTimeout(() => {
                    stop();
                    showToast("Ready for Hang 1!", 3000);
                }, 4000);
                updateUI();
                return;
            }
            stopCountdownAudio();
            phase = 'rest';
            timeRemaining = restTime;
            if (autoContinue && currentHangIndex < TOTAL_HANGS - 1) {
                restDotsTransitionTime = Date.now();
            }
            break;
        case 'rest':
            if (currentRep < hangs[currentHangIndex].totalReps) {
                currentRep += 1;
                phase = 'hang7s';
                timeRemaining = hangTime;
                stopCountdownAudio();
            } else {
                if (currentHangIndex < TOTAL_HANGS - 1) {
                    currentHangIndex += 1;
                    currentRep = 1;
                    if (autoContinue && currentHangIndex > 0) {
                        phase = 'hang7s';
                        timeRemaining = hangTime;
                        stopCountdownAudio();
                    } else {
                        phase = 'hang5s';
                        timeRemaining = 5;
                        stopCountdownAudio();
                    }
                    if (!autoContinue) {
                        clearInterval(timer);
                        timer = null;
                        isRunning = false;
                        releaseWakeLock();
                    }
                }
            }
            break;
    }
    updateUI();
}

function nextRep() {
    clearInterval(timer);
    timer = null;
    isRunning = false;
    releaseWakeLock();
    stopCountdownAudio();

    if (currentRep < hangs[currentHangIndex].totalReps) {
        currentRep += 1;
        phase = 'hang5s';
        timeRemaining = 5;
    } else if (currentHangIndex < TOTAL_HANGS - 1) {
        currentHangIndex += 1;
        currentRep = 1;
        if (autoContinue && currentHangIndex > 0) {
            phase = 'hang7s';
            timeRemaining = hangTime;
        } else {
            phase = 'hang5s';
            timeRemaining = 5;
        }
    }

    updateUI();
}

function previousHang() {
    if (currentHangIndex > 0) {
        currentHangIndex -= 1;
        currentRep = 1;
        if (autoContinue && currentHangIndex > 0) {
            phase = 'hang7s';
            timeRemaining = hangTime;
        } else {
            phase = 'hang5s';
            timeRemaining = 5;
        }
        stopCountdownAudio();
        updateUI();
    }
}

function nextHang() {
    if (currentHangIndex < TOTAL_HANGS - 1) {
        currentHangIndex += 1;
        currentRep = 1;
        if (autoContinue && currentHangIndex > 0) {
            phase = 'hang7s';
            timeRemaining = hangTime;
        } else {
            phase = 'hang5s';
            timeRemaining = 5;
        }
        stopCountdownAudio();
        updateUI();
    }
}

// Instructions modal functions
function showInstructions() {
    const overlay = document.getElementById('instructions-overlay');
    if (overlay) {
        overlay.classList.add('show');
    }
}

function hideInstructions() {
    const overlay = document.getElementById('instructions-overlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// Settings modal functions
function showSettings() {
    const overlay = document.getElementById('settings-overlay');
    const hangInput = document.getElementById('hang-time-input');
    const restInput = document.getElementById('rest-time-input');
    const autoContinueToggle = document.getElementById('auto-continue-toggle');
    const soundSelect = document.getElementById('countdown-sound-select');
    const volumeSlider = document.getElementById('volume-slider');
    if (overlay && hangInput && restInput) {
        hangInput.value = hangTime;
        restInput.value = restTime;
        if (autoContinueToggle) {
            autoContinueToggle.checked = autoContinue;
        }
        if (soundSelect) {
            soundSelect.value = selectedSound;
        }
        if (volumeSlider) {
            updateCustomVolumeSlider(Math.round(volume * 100));
        }
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.checked = soundEnabled;
        }
        overlay.classList.add('show');
    }
    if (elements.durationBadge) {
        elements.durationBadge.textContent = `${hangTime}s per hang`;
    }
}

function hideSettings() {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

function saveSettings() {
    const hangInput = document.getElementById('hang-time-input');
    const restInput = document.getElementById('rest-time-input');
    const autoContinueToggle = document.getElementById('auto-continue-toggle');
    const soundSelect = document.getElementById('countdown-sound-select');
    const volumeSlider = document.getElementById('volume-slider');
    if (hangInput && restInput) {
        const newHangTime = parseInt(hangInput.value, 10);
        const newRestTime = parseInt(restInput.value, 10);
        if (!isNaN(newHangTime) && newHangTime > 0 && newHangTime <= 60) {
            hangTime = newHangTime;
        }
        if (!isNaN(newRestTime) && newRestTime > 0 && newRestTime <= 120) {
            restTime = newRestTime;
        }
        localStorage.setItem('abrahangs_hang_time', hangTime);
        localStorage.setItem('abrahangs_rest_time', restTime);
    }
    if (autoContinueToggle) {
        autoContinue = autoContinueToggle.checked;
        localStorage.setItem('abrahangs_auto_continue', autoContinue ? 'true' : 'false');
    }
    if (soundSelect) {
        selectedSound = soundSelect.value;
        localStorage.setItem('abrahangs_countdown_sound', selectedSound);
        ensureAudioContext();
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        preloadedArrayBuffer = null;
        loadAudioBuffer();
    }
    if (volumeSlider) {
        const sliderPercent = parseInt(volumeSlider.getAttribute('data-volume') || '100', 10);
        volume = sliderPercent / 100;
        localStorage.setItem('abrahangs_volume', sliderPercent);
        if (gainNode) {
            gainNode.gain.value = volume;
        }
    }
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
        soundEnabled = soundToggle.checked;
        localStorage.setItem('abrahangs_sound_enabled', soundEnabled ? 'true' : 'false');
    }
    showToast('Settings saved!');
    hideSettings();
    updateUI();
}

function loadSettings() {
    const storedHang = localStorage.getItem('abrahangs_hang_time');
    const storedRest = localStorage.getItem('abrahangs_rest_time');
    if (storedHang) {
        const parsed = parseInt(storedHang, 10);
        if (!isNaN(parsed) && parsed > 0) {
            hangTime = parsed;
        }
    }
    if (storedRest) {
        const parsed = parseInt(storedRest, 10);
        if (!isNaN(parsed) && parsed > 0) {
            restTime = parsed;
        }
    }
    const storedAutoContinue = localStorage.getItem('abrahangs_auto_continue');
    if (storedAutoContinue !== null) {
        autoContinue = storedAutoContinue === 'true';
    }
    const storedSound = localStorage.getItem('abrahangs_countdown_sound');
    if (storedSound) {
        selectedSound = storedSound;
    }
    const storedSoundEnabled = localStorage.getItem('abrahangs_sound_enabled');
    if (storedSoundEnabled !== null) {
        soundEnabled = storedSoundEnabled === 'true';
    }
    const storedVolume = localStorage.getItem('abrahangs_volume');
    if (storedVolume !== null) {
        const parsedVolume = parseInt(storedVolume, 10);
        if (!isNaN(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 100) {
            volume = parsedVolume / 100;
        }
    }
}

function updateCustomVolumeSlider(percent) {
    const slider = document.getElementById('volume-slider');
    const fill = document.getElementById('volume-slider-fill');
    const thumb = document.getElementById('volume-slider-thumb');
    const valueText = document.getElementById('volume-value');
    const clampedPercent = Math.max(0, Math.min(100, percent));
    if (slider) {
        slider.setAttribute('data-volume', clampedPercent);
        slider.setAttribute('aria-valuenow', clampedPercent);
    }
    if (fill) {
        fill.style.width = clampedPercent + '%';
    }
    if (thumb) {
        thumb.style.left = clampedPercent + '%';
    }
    if (valueText) {
        valueText.textContent = clampedPercent + '%';
    }
}

// --- Countdown Audio (Web Audio API) ---

const COUNTDOWN_START_AT = 3;

function getCountdownSoundPath() {
    return 'sounds/' + selectedSound;
}

function ensureAudioContext() {
    initAudioSession();
    if (!audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return false;
        audioContext = new AudioContextClass();
        gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = volume;
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return true;
}

function unlockAudioContext() {
    if (!audioContext) return;
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    if (audioContext.state === 'running') {
        try {
            const buffer = audioContext.createBuffer(1, 1, 22050);
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start();
            source.onended = function () {
                source.disconnect();
            };
        } catch (e) {
            // ignore
        }
    }
}

function initAudioSession() {
    if (navigator.audioSession) {
        navigator.audioSession.type = 'playback';
    }
}

async function loadAudioBuffer() {
    const path = getCountdownSoundPath();
    if (audioBuffers[path]) return;
    try {
        let arrayBuffer = preloadedArrayBuffer;
        if (!arrayBuffer) {
            const response = await fetch(path);
            if (!response.ok) {
                console.warn('Failed to fetch audio file:', path, response.status);
                return;
            }
            arrayBuffer = await response.arrayBuffer();
        }
        if (!audioContext) {
            console.warn('loadAudioBuffer: no audioContext');
            return;
        }
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers[path] = audioBuffer;
        preloadedArrayBuffer = null;
    } catch (e) {
        console.warn('Failed to load audio buffer:', e);
    }
}

async function preloadAudioBuffer() {
    try {
        const path = getCountdownSoundPath();
        const response = await fetch(path);
        if (response.ok) {
            preloadedArrayBuffer = await response.arrayBuffer();
        }
    } catch (e) {
        console.warn('Failed to preload audio buffer:', e);
    }
}

function startCountdownAudio() {
    if (!gainNode) {
        console.warn('startCountdownAudio: no gainNode');
        return;
    }
    if (!soundEnabled) return;
    if (phase !== 'hang5s' && phase !== 'rest' && phase !== 'hang7s') return;
    stopCountdownAudio();
    const buffer = audioBuffers[getCountdownSoundPath()];
    if (!buffer) {
        console.warn('startCountdownAudio: buffer not loaded for', getCountdownSoundPath());
        return;
    }
    try {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(gainNode);
        source.start(0, 0);
        activeSource = source;
        sourceStartTime = audioContext.currentTime;
        sourceOffset = 0;
        source.onended = function () {
            if (activeSource === source) {
                activeSource = null;
            }
        };
    } catch (e) {
        console.warn('Audio playback failed:', e);
    }
}

function stopCountdownAudio() {
    if (activeSource) {
        try {
            activeSource.onended = null;
            activeSource.stop();
        } catch (e) {
            // ignore
        }
        activeSource = null;
    }
    sourceOffset = 0;
}

function pauseCountdownAudio() {
    if (!activeSource || !audioContext) return;
    try {
        sourceOffset = audioContext.currentTime - sourceStartTime;
        activeSource.onended = null;
        activeSource.stop();
    } catch (e) {
        // ignore
    }
    activeSource = null;
}

function resumeCountdownAudio() {
    if (!gainNode) {
        console.warn('resumeCountdownAudio: no gainNode');
        return;
    }
    if (!soundEnabled) return;
    if (phase !== 'hang5s' && phase !== 'rest' && phase !== 'hang7s') return;
    if (timeRemaining > COUNTDOWN_START_AT || timeRemaining <= 0) return;
    if (!audioBuffers[getCountdownSoundPath()]) {
        console.warn('resumeCountdownAudio: buffer not loaded for', getCountdownSoundPath());
        return;
    }
    try {
        if (activeSource) {
            activeSource.onended = null;
            activeSource.stop();
            activeSource = null;
        }
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffers[getCountdownSoundPath()];
        source.connect(gainNode);
        const offset = sourceOffset > 0 ? sourceOffset : 0;
        source.start(0, offset);
        activeSource = source;
        sourceStartTime = audioContext.currentTime;
        sourceOffset = 0;
        source.onended = function () {
            if (activeSource === source) {
                activeSource = null;
            }
        };
    } catch (e) {
        console.warn('Audio resume failed:', e);
    }
}

// Wake Lock - prevent screen from turning off
let wakeLock = null;

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock active');
        }
    } catch (err) {
        console.log('Wake Lock error:', err);
        if (err.name === 'NotFoundError') {
            showToast('Screen wake lock not available on this device.', 3000);
        } else if (err.name === 'NotAllowedError') {
            showToast('Screen wake lock was denied. Check device settings.', 3000);
        }
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        try {
            wakeLock.release();
        } catch (e) {
            // Lock may have already been released by the OS
        }
        wakeLock = null;
        console.log('Wake Lock released');
    }
}

// Set up event listeners for better reliability
document.addEventListener('DOMContentLoaded', function () {
    cacheElements();
    initCompletedReps();

    document.getElementById('prev-btn').addEventListener('click', previousHang);
    document.getElementById('next-btn').addEventListener('click', nextHang);
    document.getElementById('history-btn').addEventListener('click', goToHistory);
    document.getElementById('play-btn').addEventListener('click', play);
    document.getElementById('pause-btn').addEventListener('click', pause);
    document.getElementById('stop-btn').addEventListener('click', stop);
    document.getElementById('next-rep-btn').addEventListener('click', nextRep);

    const infoBtn = document.getElementById('info-btn');
    if (infoBtn) {
        infoBtn.addEventListener('click', showInstructions);
    }

    const instructionsOverlay = document.getElementById('instructions-overlay');
    if (instructionsOverlay) {
        instructionsOverlay.addEventListener('click', function (e) {
            if (e.target === instructionsOverlay) {
                hideInstructions();
            }
        });
    }

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettings);
    }

    const settingsOverlay = document.getElementById('settings-overlay');
    if (settingsOverlay) {
        settingsOverlay.addEventListener('click', function (e) {
            if (e.target === settingsOverlay) {
                hideSettings();
            }
        });
    }

    const settingsSaveBtn = document.getElementById('settings-save-btn');
    if (settingsSaveBtn) {
        settingsSaveBtn.addEventListener('click', saveSettings);
    }

    const clearCacheBtn = document.getElementById('settings-clear-btn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', function() {
            document.getElementById('clear-cache-modal').classList.add('show');
        });
    }

    const clearCacheCancel = document.getElementById('clear-cache-cancel');
    if (clearCacheCancel) {
        clearCacheCancel.addEventListener('click', function() {
            document.getElementById('clear-cache-modal').classList.remove('show');
            stop();
        });
    }

    const clearCacheConfirm = document.getElementById('clear-cache-confirm');
    if (clearCacheConfirm) {
        clearCacheConfirm.addEventListener('click', function() {
            document.getElementById('clear-cache-modal').classList.remove('show');
            clearCache();
        });
    }

    const clearCacheModal = document.getElementById('clear-cache-modal');
    if (clearCacheModal) {
        clearCacheModal.addEventListener('click', function(e) {
            if (e.target === clearCacheModal) {
                clearCacheModal.classList.remove('show');
            }
        });
    }

    const autoContinueToggle = document.getElementById('auto-continue-toggle');
    if (autoContinueToggle) {
        autoContinueToggle.addEventListener('change', function () {
            autoContinue = autoContinueToggle.checked;
            localStorage.setItem('abrahangs_auto_continue', autoContinue ? 'true' : 'false');
        });
    }

    const soundSelect = document.getElementById('countdown-sound-select');
    if (soundSelect) {
        soundSelect.addEventListener('change', function () {
            selectedSound = soundSelect.value;
            localStorage.setItem('abrahangs_countdown_sound', selectedSound);
            loadAudioBuffer();
        });
    }

    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
        soundToggle.addEventListener('change', function () {
            soundEnabled = soundToggle.checked;
            localStorage.setItem('abrahangs_sound_enabled', soundEnabled ? 'true' : 'false');
        });
    }

    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
        updateCustomVolumeSlider(Math.round(volume * 100));

        const setVolumeFromPointer = function (clientX) {
            const rect = volumeSlider.getBoundingClientRect();
            let x = clientX - rect.left;
            x = Math.max(0, Math.min(x, rect.width));
            const percent = Math.round((x / rect.width) * 100);
            volume = Math.max(0, Math.min(100, percent)) / 100;
            if (gainNode) {
                gainNode.gain.value = volume;
            }
            updateCustomVolumeSlider(Math.round(volume * 100));
        };

        volumeSlider.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            volumeSlider.setPointerCapture(e.pointerId);
            setVolumeFromPointer(e.clientX);
        });

        volumeSlider.addEventListener('pointermove', function (e) {
            if (e.buttons > 0 || volumeSlider.hasPointerCapture(e.pointerId)) {
                setVolumeFromPointer(e.clientX);
            }
        });

        volumeSlider.addEventListener('pointerup', function (e) {
            volumeSlider.releasePointerCapture(e.pointerId);
        });

        volumeSlider.addEventListener('keydown', function (e) {
            let delta = 0;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                delta = 1;
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                delta = -1;
            } else if (e.key === 'Home') {
                delta = -100;
            } else if (e.key === 'End') {
                delta = 100;
            }
            if (delta !== 0) {
                e.preventDefault();
                const newPercent = Math.max(0, Math.min(100, parseInt(volumeSlider.getAttribute('data-volume') || '100', 10) + delta));
                volume = newPercent / 100;
                if (gainNode) {
                    gainNode.gain.value = volume;
                }
                updateCustomVolumeSlider(newPercent);
            }
        });
    }

    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    if (isIOS() && !localStorage.getItem('abrahangs_audio_info_shown')) {
        document.getElementById('audio-info-overlay').classList.add('show');
        localStorage.setItem('abrahangs_audio_info_shown', 'true');
    }

    const audioInfoClose = document.getElementById('audio-info-close');
    if (audioInfoClose) {
        audioInfoClose.addEventListener('click', function() {
            document.getElementById('audio-info-overlay').classList.remove('show');
        });
    }

    const audioInfoOverlay = document.getElementById('audio-info-overlay');
    if (audioInfoOverlay) {
        audioInfoOverlay.addEventListener('click', function(e) {
            if (e.target === audioInfoOverlay) {
                audioInfoOverlay.classList.remove('show');
            }
        });
    }

    const soundInfoIcon = document.getElementById('sound-info-icon');
    if (soundInfoIcon) {
        soundInfoIcon.addEventListener('click', function() {
            document.getElementById('sound-info-overlay').classList.add('show');
        });
    }

    const soundInfoClose = document.getElementById('sound-info-close');
    if (soundInfoClose) {
        soundInfoClose.addEventListener('click', function() {
            document.getElementById('sound-info-overlay').classList.remove('show');
        });
    }

    const soundInfoOverlay = document.getElementById('sound-info-overlay');
    if (soundInfoOverlay) {
        soundInfoOverlay.addEventListener('click', function(e) {
            if (e.target === soundInfoOverlay) {
                soundInfoOverlay.classList.remove('show');
            }
        });
    }

    // Page visibility handling - pause timer when tab is hidden
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            wasRunningBeforeHidden = isRunning;
            if (isRunning) {
                pause();
            }
        } else {
            // Resume if it was running before
            if (wasRunningBeforeHidden) {
                play();
                wasRunningBeforeHidden = false;
            }
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                if (isRunning) {
                    pause();
                } else {
                    play();
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                previousHang();
                break;
            case 'ArrowRight':
                e.preventDefault();
                nextHang();
                break;
            case 'KeyR':
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    nextRep();
                }
                break;
            case 'Escape':
                e.preventDefault();
                stop();
                break;
        }
    });

    loadSettings();
    updateUI();

    updateCustomVolumeSlider(Math.round(volume * 100));

    preloadAudioBuffer();

    // Reload page when a new service worker takes over. Skip on the reload
    // right after clearCache() so the page only reloads once (avoids a loop).
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', function () {
            if (sessionStorage.getItem('abrahangs_skipControllerReload') === 'true') {
                sessionStorage.removeItem('abrahangs_skipControllerReload');
                return;
            }
            window.location.reload();
        });
    }
});

async function clearCache() {
    try {
        localStorage.clear();
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                await registration.unregister();
            }
        }
        sessionStorage.setItem('abrahangs_skipControllerReload', 'true');
        window.location.reload();
    } catch (e) {
        console.warn('Clear cache failed:', e);
    }
}
