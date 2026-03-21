const $ = (id) => document.getElementById(id);

const WORDS = {
    easy: ['ASLAN', 'ELMA', 'EV', 'ARABA', 'KEDİ', 'KÖPEK', 'GÜNEŞ', 'AY', 'YILDIZ', 'BULUT'],
    medium: ['TELEFON', 'BİLGİSAYAR', 'OKUL', 'ARKADAŞ', 'MÜZİK', 'RESİM', 'DANS', 'FUTBOL', 'OYUN', 'PARTİ'],
    hard: ['İSTANBUL', 'ANKARA', 'PROGRAMLAMA', 'TEKNOLOJİ', 'SANAT', 'JAVASCRIPT', 'HTML', 'MİMARLIK', 'FELSEFE', 'COĞRAFYA']
};

const HINTS = {
    ASLAN: 'Hayvanlar aleminin kralı 🦁',
    ELMA: 'Kırmızı ve sulu meyve 🍎',
    EV: 'Ailemizle yaşadığımız yer 🏠',
    ARABA: '4 tekerlekli ulaşım aracı 🚗',
    KEDİ: 'Miyavlayan evcil hayvan 🐱',
    KÖPEK: 'Sadık dostumuz 🐶',
    GÜNEŞ: 'Gündüzün ışık kaynağı ☀️',
    AY: 'Gecenin güzel ışığı 🌙',
    YILDIZ: 'Gökyüzünde parlayan noktalar ⭐',
    BULUT: 'Gökyüzünde yüzen pamuksu yapılar ☁️',
    TELEFON: 'Uzaktan konuşma cihazı 📱',
    BİLGİSAYAR: 'Dijital yardımcı 💻',
    OKUL: 'Bilgi öğrendiğimiz yer 🏫',
    ARKADAŞ: 'En iyi sırdaş 😊',
    MÜZİK: 'Ruhumuzu dinlendiren sesler 🎵',
    RESİM: 'Renklerle hikaye anlatır 🎨',
    DANS: 'Müzikle ritim tutma 💃',
    FUTBOL: 'Dünyanın en popüler oyunu ⚽',
    OYUN: 'Eğlencenin ta kendisi 🎮',
    PARTİ: 'Hep birlikte kutlama 🎉',
    İSTANBUL: 'İki kıtayı birleştiren şehir 🌉',
    ANKARA: 'Ülkemizin başkenti 🏛️',
    PROGRAMLAMA: 'Kod yazma sanatı 💾',
    TEKNOLOJİ: 'Geleceğin anahtarı 🚀',
    SANAT: 'Duyguları ifade etme yolu 🖼️',
    HTML: 'Web sayfalarının iskeleti 🌐',
    JAVASCRIPT: 'Tarayıcıda çalışan web programlama dili 🟨',
    MİMARLIK: 'Bina tasarlama ve inşa etme sanatı 🏗️',
    FELSEFE: 'Varlık ve bilgiyi sorgulayan düşünce dalı 🤔',
    COĞRAFYA: 'Yeryüzünü inceleyen bilim dalı 🗺️'
};

const LEVEL_LABELS = { easy: 'Kolay', medium: 'Orta', hard: 'Zor' };
const LS_KEY = 'kelimeAviScores';

const App = {
    state: {
        mode: 'single',
        currentWord: '',
        displayWord: [],
        level: 'easy',
        single: {
            attempts: 10,
            score: 0,
            correctGuesses: 0,
            active: false,
            guessedLetters: new Set(),
            timerInterval: null,
            timerSeconds: 60,
            timerMax: 60
        },
        group: {
            players: [],
            currentPlayerIndex: 0,
            attempts: 8,
            guessedLetters: new Set(),
            locked: false,
            turnTimeoutId: null
        }
    },

    normalizeTurkish(text) {
        return (text ?? '').toLocaleUpperCase('tr-TR').trim();
    },

    isValidTurkishLetter(char) {
        return /^[A-ZÇĞİÖŞÜ]$/.test(this.normalizeTurkish(char));
    },

    init() {
        this.setupInputEvents();
        this.setupPlayerNameInputs();
        this.newGame();
    },

    setupInputEvents() {
        const bindEnter = (id, callback) => {
            $(id).addEventListener('keypress', (e) => e.key === 'Enter' && callback());
        };
        bindEnter('letterInput', () => this.guessLetter());
        bindEnter('groupLetterInput', () => this.groupGuessLetter());

        ['letterInput', 'groupLetterInput'].forEach((id) => {
            $(id).addEventListener('input', function () {
                const pos = this.selectionStart;
                this.value = App.normalizeTurkish(this.value);
                this.setSelectionRange(pos, pos);
            });
        });
    },

    setupPlayerNameInputs() {
        ['player1Name', 'player2Name', 'player3Name'].forEach((id, idx) => {
            const input = $(id);
            input.value = `Oyuncu ${idx + 1}`;
            input.addEventListener('input', () => this.updatePlayerNames());
        });
    },

    updatePlayerNames() {
        const prev = this.state.group.players;
        const p1 = $('player1Name').value.trim() || 'Oyuncu 1';
        const p2 = $('player2Name').value.trim() || 'Oyuncu 2';
        const p3 = $('player3Name').value.trim() || 'Oyuncu 3';
        this.state.group.players = [
            { name: p1, score: prev[0]?.score || 0 },
            { name: p2, score: prev[1]?.score || 0 },
            { name: p3, score: prev[2]?.score || 0 }
        ];
        if (this.state.mode === 'group') this.updatePlayersDisplay();
    },

    selectMode(mode, event) {
        this.state.mode = mode;
        document.querySelectorAll('.mode-btn').forEach((btn) => btn.classList.remove('active'));
        if (event?.target) event.target.classList.add('active');

        $('singleMode').classList.toggle('active', mode === 'single');
        $('groupMode').classList.toggle('active', mode === 'group');

        if (mode === 'group') {
            this.updatePlayerNames();
            this.initGroupMode();
        } else {
            this.newGame();
        }
    },

    getRandomWord() {
        const list = WORDS[this.state.level];
        return list[Math.floor(Math.random() * list.length)];
    },

    initDisplay() {
        this.state.displayWord = this.state.currentWord.split('').map(() => '_');
        this.updateDisplay();
    },

    updateDisplay() {
        const id = this.state.mode === 'single' ? 'wordDisplay' : 'groupWordDisplay';
        $(id).textContent = this.state.displayWord.join(' ');
    },

    updateHint() {
        const id = this.state.mode === 'single' ? 'hint' : 'groupHint';
        $(id).textContent = HINTS[this.state.currentWord] || 'İpucu hazırlanıyor... 🤔';
    },

    getSingleRandomLevel() {
        const r = Math.random();
        if (r < 0.4) return 'easy';
        if (r < 0.7) return 'medium';
        return 'hard';
    },

    getGroupRandomLevel() {
        return ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)];
    },

    getTimerDuration() {
        if (this.state.level === 'hard') return 45;
        if (this.state.level === 'medium') return 60;
        return 75;
    },

    startTimer() {
        this.stopTimer();
        const s = this.state.single;
        s.timerMax = this.getTimerDuration();
        s.timerSeconds = s.timerMax;
        this.updateTimerUI();

        s.timerInterval = setInterval(() => {
            s.timerSeconds -= 1;
            this.updateTimerUI();
            if (s.timerSeconds <= 0) {
                this.stopTimer();
                s.active = false;
                this.saveScore(s.score, false);
                this.showMessage(`⏰ Süre doldu! Kelime: "${this.state.currentWord}" — Puan: ${s.score}`, 'error');
            }
        }, 1000);
    },

    stopTimer() {
        const s = this.state.single;
        if (!s.timerInterval) return;
        clearInterval(s.timerInterval);
        s.timerInterval = null;
    },

    updateTimerUI() {
        const fill = $('timerFill');
        const text = $('timerText');
        const s = this.state.single;
        const pct = (s.timerSeconds / s.timerMax) * 100;

        fill.style.width = `${pct}%`;
        text.textContent = s.timerSeconds;
        fill.classList.remove('warning', 'danger');
        if (pct <= 25) fill.classList.add('danger');
        else if (pct <= 50) fill.classList.add('warning');
    },

    loadScores() {
        try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
        catch { return []; }
    },

    saveScore(points, won) {
        if (points <= 0 && !won) return;
        const scores = this.loadScores();
        scores.push({
            score: points,
            won,
            level: this.state.level,
            levelLabel: LEVEL_LABELS[this.state.level],
            word: this.state.currentWord,
            timeLeft: this.state.single.timerSeconds,
            date: new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' })
        });
        scores.sort((a, b) => b.score - a.score);
        scores.splice(50);
        try { localStorage.setItem(LS_KEY, JSON.stringify(scores)); } catch {}
    },

    openLeaderboard() {
        const scores = this.loadScores();
        const el = $('lbContent');
        if (scores.length === 0) {
            el.innerHTML = '<div class="lb-empty">Henüz kayıtlı skor yok.<br>Bir oyun bitir, burada görün! 🎮</div>';
        } else {
            const medals = ['🥇', '🥈', '🥉'];
            const rows = scores.slice(0, 10).map((s, i) => {
                const rowClass = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
                const result = s.won ? '✅' : '❌';
                const timeBonus = s.won ? `+${s.timeLeft}sn` : '—';
                return `<tr class="${rowClass}">
                    <td>${medals[i] || `${i + 1}.`}</td>
                    <td><strong>${s.score}</strong></td>
                    <td><span class="lb-badge ${s.level}">${s.levelLabel}</span></td>
                    <td>${result} ${s.word}</td>
                    <td>${timeBonus}</td>
                    <td style="opacity:0.7;font-size:0.85em">${s.date}</td>
                </tr>`;
            }).join('');
            el.innerHTML = `<table class="lb-table">
                <thead><tr><th>#</th><th>Puan</th><th>Seviye</th><th>Kelime</th><th>Kalan</th><th>Tarih</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div style="opacity:0.6;font-size:0.82em;margin-top:10px;text-align:right">Toplam ${scores.length} oyun kaydedildi</div>`;
        }
        $('lbModalOverlay').classList.add('visible');
    },

    closeLb() {
        $('lbModalOverlay').classList.remove('visible');
    },

    clearLeaderboard() {
        if (!confirm('Tüm skor geçmişi silinsin mi?')) return;
        try { localStorage.removeItem(LS_KEY); } catch {}
        this.openLeaderboard();
    },

    updateGuessedLettersDisplay() {
        const s = this.state.single;
        $('guessedLettersDisplay').innerHTML = [...s.guessedLetters].map((letter) => {
            const isHit = this.state.currentWord.includes(letter);
            return `<div class="guessed-letter ${isHit ? 'hit' : 'miss'}" title="${isHit ? 'Doğru' : 'Yanlış'}">${letter}</div>`;
        }).join('');
    },

    updateGroupGuessedLettersDisplay() {
        const g = this.state.group;
        $('groupGuessedLettersDisplay').innerHTML = [...g.guessedLetters].map((letter) => {
            const isHit = this.state.currentWord.includes(letter);
            return `<div class="guessed-letter ${isHit ? 'hit' : 'miss'}">${letter}</div>`;
        }).join('');
    },

    showScoreModal(winnerName) {
        const sorted = [...this.state.group.players].sort((a, b) => b.score - a.score);
        const medals = ['🥇', '🥈', '🥉'];
        $('modalTitle').textContent = winnerName ? '🏆 Kelime Bulundu!' : '💥 Süre Doldu!';
        $('modalWinner').textContent = winnerName ? `${winnerName} bu turu kazandı!` : 'Kimse kelimeyi bulamadı.';
        $('modalScores').innerHTML = sorted.map((p, i) => {
            const winner = p.name === sorted[0].name ? 'winner' : '';
            return `<div class="modal-score-row ${winner}">
                <span><span class="rank">${medals[i] || '  '}</span>${p.name}</span>
                <span class="pts">${p.score} puan</span>
            </div>`;
        }).join('');
        $('scoreModalOverlay').classList.add('visible');
    },

    closeScoreModal() {
        $('scoreModalOverlay').classList.remove('visible');
        this.newGroupGame();
    },

    applyLetterToWord(letter) {
        let foundCount = 0;
        for (let i = 0; i < this.state.currentWord.length; i += 1) {
            if (this.state.currentWord[i] !== letter) continue;
            this.state.displayWord[i] = letter;
            foundCount += 1;
        }
        return foundCount;
    },

    guessLetter() {
        const input = $('letterInput');
        const letter = this.normalizeTurkish(input.value);
        const s = this.state.single;
        input.value = '';
        input.focus();

        if (!letter || !this.isValidTurkishLetter(letter)) {
            this.showMessage('❌ Lütfen geçerli bir Türkçe harf girin! (A-Z, Ç,Ğ,İ,Ö,Ş,Ü)', 'error');
            input.classList.add('shake');
            setTimeout(() => input.classList.remove('shake'), 500);
            return;
        }
        if (!s.active) {
            this.showMessage('⚠️ Yeni oyun başlatın!', 'info');
            return;
        }
        if (s.guessedLetters.has(letter)) {
            this.showMessage(`⚠️ "${letter}" harfini zaten denediniz!`, 'info');
            return;
        }
        s.guessedLetters.add(letter);

        if (this.state.currentWord.includes(letter)) {
            const foundCount = this.applyLetterToWord(letter);
            s.score += foundCount * 15;
            s.correctGuesses += 1;
            this.updateScore();
            this.updateDisplay();
            this.updateGuessedLettersDisplay();

            $('wordDisplay').classList.add('bounce');
            setTimeout(() => $('wordDisplay').classList.remove('bounce'), 800);

            if (!this.state.displayWord.includes('_')) {
                this.stopTimer();
                const timeBonus = s.timerSeconds * 2;
                s.score += timeBonus;
                this.updateScore();
                this.saveScore(s.score, true);
                this.showMessage(`🎉 "${this.state.currentWord}" bildiniz! Süre bonusu: +${timeBonus} — Toplam: ${s.score}`, 'success');
                s.active = false;
                this.checkLevelUp();
                return;
            }
            this.showMessage(`✅ ${foundCount} harf bulundu! +${foundCount * 15} puan`, 'success');
            return;
        }

        s.attempts -= 1;
        this.updateAttempts();
        this.updateGuessedLettersDisplay();
        this.showMessage(`❌ Yanlış harf! Kalan deneme: ${s.attempts}`, 'error');
        if (s.attempts !== 0) return;

        this.stopTimer();
        this.saveScore(s.score, false);
        this.showMessage(`💥 Oyun bitti! Kelime: "${this.state.currentWord}" — Toplam Puan: ${s.score}`, 'error');
        s.active = false;
    },

    setGroupLocked(locked) {
        this.state.group.locked = locked;
        $('groupLetterInput').disabled = locked;
        $('groupGuessBtn').disabled = locked;
        if (!locked) $('groupLetterInput').focus();
    },

    scheduleGroup(fn, ms) {
        const g = this.state.group;
        if (g.turnTimeoutId !== null) {
            clearTimeout(g.turnTimeoutId);
            g.turnTimeoutId = null;
        }
        this.setGroupLocked(true);
        g.turnTimeoutId = setTimeout(() => {
            g.turnTimeoutId = null;
            fn();
        }, ms);
    },

    groupGuessLetter() {
        const g = this.state.group;
        if (g.locked) return;

        const input = $('groupLetterInput');
        const letter = this.normalizeTurkish(input.value);
        input.value = '';
        input.focus();

        if (!letter || !this.isValidTurkishLetter(letter)) {
            this.showGroupMessage('❌ Geçerli Türkçe harf girin! (A-Z, Ç,Ğ,İ,Ö,Ş,Ü)', 'error');
            return;
        }
        if (g.guessedLetters.has(letter)) {
            this.showGroupMessage(`⚠️ "${letter}" bu turda zaten denendi!`, 'info');
            return;
        }
        g.guessedLetters.add(letter);
        this.updateGroupGuessedLettersDisplay();

        const currentPlayer = g.players[g.currentPlayerIndex];
        if (this.state.currentWord.includes(letter)) {
            const foundCount = this.applyLetterToWord(letter);
            currentPlayer.score += foundCount * 20;
            this.updatePlayersDisplay();
            this.updateDisplay();

            if (!this.state.displayWord.includes('_')) {
                this.showGroupMessage(`🏆 ${currentPlayer.name} kelimeyi buldu!`, 'success');
                this.scheduleGroup(() => this.showScoreModal(currentPlayer.name), 1500);
                return;
            }
            this.showGroupMessage(`✅ ${currentPlayer.name}: ${foundCount} harf buldu! +${foundCount * 20} puan`, 'success');
            this.scheduleGroup(() => this.nextPlayer(), 1500);
            return;
        }

        g.attempts -= 1;
        this.showGroupMessage(`❌ ${currentPlayer.name}: Yanlış! Kalan deneme: ${g.attempts}`, 'error');
        if (g.attempts === 0) {
            this.showGroupMessage(`⏭️ Deneme hakkı bitti! Kelime: "${this.state.currentWord}"`, 'error');
            this.scheduleGroup(() => this.showScoreModal(null), 1500);
            return;
        }
        this.scheduleGroup(() => this.nextPlayer(), 1500);
    },

    nextPlayer() {
        const g = this.state.group;
        g.currentPlayerIndex = (g.currentPlayerIndex + 1) % g.players.length;
        const current = g.players[g.currentPlayerIndex];
        this.showGroupMessage(`🎯 ${current.name}'in sırası!`, 'info');
        this.updatePlayersDisplay();
        this.setGroupLocked(false);
    },

    initGroupMode() {
        this.updatePlayersDisplay();
        this.newGroupGame();
    },

    updatePlayersDisplay() {
        const g = this.state.group;
        $('playersContainer').innerHTML = g.players.map((player, idx) => {
            const active = idx === g.currentPlayerIndex ? 'active' : '';
            return `<div class="player-score ${active}">
                ${player.name}<br><strong>${player.score} puan</strong>
            </div>`;
        }).join('');
    },

    newGroupGame() {
        const g = this.state.group;
        if (g.turnTimeoutId !== null) {
            clearTimeout(g.turnTimeoutId);
            g.turnTimeoutId = null;
        }

        this.state.level = this.getGroupRandomLevel();
        this.state.currentWord = this.getRandomWord();
        this.initDisplay();
        this.updateHint();
        g.attempts = 8;
        g.currentPlayerIndex = 0;
        g.guessedLetters = new Set();
        this.updateGroupGuessedLettersDisplay();
        this.updatePlayersDisplay();

        const current = g.players[g.currentPlayerIndex] || { name: 'Oyuncu 1' };
        this.showGroupMessage(`🎮 ${current.name} oyunu başlatıyor!`, 'info');
        this.setGroupLocked(false);
    },

    newGame() {
        const s = this.state.single;
        this.state.level = this.getSingleRandomLevel();
        this.state.currentWord = this.getRandomWord();
        this.initDisplay();
        this.updateHint();

        s.attempts = this.state.level === 'hard' ? 8 : 10;
        s.score = 0;
        s.correctGuesses = 0;
        s.active = true;
        s.guessedLetters = new Set();

        this.updateGuessedLettersDisplay();
        this.updateScore();
        this.updateAttempts();
        this.updateLevel();
        this.startTimer();

        const msg = $('message');
        msg.className = 'message';
        msg.textContent = '';
        $('letterInput').focus();
    },

    checkLevelUp() {
        const s = this.state.single;
        if (s.correctGuesses >= 15 && this.state.level === 'easy') this.state.level = 'medium';
        else if (s.correctGuesses >= 30 && this.state.level === 'medium') this.state.level = 'hard';
    },

    updateScore() {
        const s = this.state.single;
        $('score').textContent = s.score;
        $('correct').textContent = s.correctGuesses;
    },

    updateAttempts() {
        $('attempts').textContent = this.state.single.attempts;
    },

    updateLevel() {
        $('level').textContent = LEVEL_LABELS[this.state.level];
    },

    renderMessage(id, text, type) {
        const el = $(id);
        el.textContent = text;
        el.className = `message ${type} fade-in`;
    },

    showMessage(text, type) {
        this.renderMessage('message', text, type);
    },

    showGroupMessage(text, type) {
        this.renderMessage('groupMessage', text, type);
    }
};

function selectMode(mode, event) { App.selectMode(mode, event); }
function guessLetter() { App.guessLetter(); }
function newGame() { App.newGame(); }
function groupGuessLetter() { App.groupGuessLetter(); }
function newGroupGame() { App.newGroupGame(); }
function openLeaderboard() { App.openLeaderboard(); }
function closeLb() { App.closeLb(); }
function clearLeaderboard() { App.clearLeaderboard(); }
function closeScoreModal() { App.closeScoreModal(); }

document.addEventListener('DOMContentLoaded', () => App.init());
