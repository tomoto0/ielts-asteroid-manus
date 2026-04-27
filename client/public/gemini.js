// Gemini API integration for Asteroid Game
class GeminiAI {
    constructor() {
        // API calls are proxied through the server so the API key is never exposed to the client
        this.proxyUrl = '/api/gemini-tip';
    }

    async generateContent(prompt) {
        try {
            const response = await fetch(this.proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.text || this.getFallbackMessage(prompt);
        } catch (error) {
            console.error('Gemini Proxy Error:', error);
            // フォールバック: 事前定義されたメッセージを返す
            return this.getFallbackMessage(prompt);
        }
    }

    // APIが利用できない場合のフォールバックメッセージ
    getFallbackMessage(prompt) {
        const typingGameTips = [
            "Focus on accuracy over speed when typing words.",
            "Look ahead to the next word while typing the current one.",
            "Use proper finger positioning for faster typing.",
            "Practice common letter combinations to improve fluency.",
            "Take breaks to avoid finger fatigue during long sessions.",
            "Start with shorter words and gradually work up to longer ones.",
            "Use the rhythm of the game to maintain consistent typing speed.",
            "Don't panic when asteroids approach - stay calm and type accurately.",
            "Learn to recognize word patterns to type more efficiently.",
            "Practice typing without looking at the keyboard.",
            "Use muscle memory to type common words automatically.",
            "Focus on one asteroid at a time to avoid confusion.",
            "Type in bursts rather than trying to maintain constant speed.",
            "Learn keyboard shortcuts to improve overall typing efficiency.",
            "Practice typing difficult letter combinations like 'qu', 'th', 'ch'.",
            "Use proper posture to reduce strain and improve accuracy.",
            "Develop a steady rhythm rather than rushing through words.",
            "Practice typing numbers and special characters as well.",
            "Learn to type common prefixes and suffixes quickly.",
            "Use online typing games to improve your skills outside this game.",
            "Focus on eliminating typing errors rather than increasing speed.",
            "Practice typing with both hands equally to maintain balance.",
            "Learn to anticipate the next letter while typing the current one.",
            "Use the backspace key efficiently when you make mistakes.",
            "Practice typing in different languages to improve versatility.",
            "Develop finger independence to type multiple letters simultaneously.",
            "Learn to type common word endings like '-ing', '-tion', '-ness'.",
            "Practice typing while listening to music to improve concentration.",
            "Use typing drills to strengthen weak finger movements.",
            "Learn to type punctuation marks quickly and accurately."
        ];
        
        const vocabularyTips = [
            "Learn word roots, prefixes, and suffixes to understand new words.",
            "Use flashcards to memorize difficult vocabulary words.",
            "Read extensively to encounter words in different contexts.",
            "Practice using new words in sentences to remember them better.",
            "Group similar words together to learn them more efficiently.",
            "Use mnemonics to remember difficult word meanings.",
            "Study word families to expand your vocabulary quickly.",
            "Learn synonyms and antonyms to deepen word understanding.",
            "Practice spelling difficult words by writing them multiple times.",
            "Use vocabulary in daily conversation to reinforce learning.",
            "Study etymology to understand how words evolved over time.",
            "Learn collocations - words that commonly go together.",
            "Practice using context clues to guess word meanings.",
            "Create word maps to visualize relationships between words.",
            "Use spaced repetition to review vocabulary regularly.",
            "Learn academic vocabulary for formal writing and speaking.",
            "Study phrasal verbs and idiomatic expressions.",
            "Practice pronunciation along with spelling and meaning.",
            "Use visual associations to remember word meanings.",
            "Learn words in thematic groups like emotions, nature, technology."
        ];
        
        const gameStrategyTips = [
            "Prioritize asteroids that are closest to the bottom of the screen.",
            "Target shorter words first to clear space quickly.",
            "Use peripheral vision to track multiple asteroids simultaneously.",
            "Develop a scanning pattern to efficiently identify targets.",
            "Practice switching between targets quickly and smoothly.",
            "Learn to estimate asteroid trajectories to plan your typing sequence.",
            "Learn to estimate asteroid trajectories to plan your typing sequence.",
            "Focus on high-value targets when multiple options are available.",
            "Use the pause between waves to prepare for the next challenge.",
            "Develop strategies for handling multiple asteroids with similar starting letters.",
            "Practice typing under pressure to improve performance in intense moments."
        ];
        
        const allTips = [...typingGameTips, ...vocabularyTips, ...gameStrategyTips];
        
        if (prompt.includes('Game Over') || prompt.includes('game over')) {
            const encouragementMessages = [
                "Great effort! Every game improves your typing and vocabulary skills.",
                "Well played! Practice makes perfect in both typing and language learning.",
                "Good game! You're building valuable skills with each attempt.",
                "Nice try! Each game session strengthens your typing muscle memory.",
                "Excellent practice! Your vocabulary and typing speed are improving.",
                "Well done! Consistent practice leads to mastery.",
                "Good work! You're developing both speed and accuracy.",
                "Great session! Learning new words while improving typing skills.",
                "Nice effort! Every mistake is a learning opportunity.",
                "Well played! You're building essential language and typing skills."
            ];
            return encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
        }
        
        return allTips[Math.floor(Math.random() * allTips.length)];
    }

    // ゲーム関連のプロンプト生成
    generateGameTip() {
        const prompts = [
            "Give me one typing tip for improving accuracy and speed. Be concise.",
            "What is one important strategy for vocabulary learning? Be brief.",
            "How to efficiently play typing games? Be concise.",
            "Give me one tip for better keyboard technique. Be brief.",
            "What's one effective method for memorizing new words? Be concise.",
            "How to improve typing speed without sacrificing accuracy? Be brief.",
            "Give me one strategy for learning IELTS vocabulary. Be concise.",
            "What's one tip for maintaining focus during typing practice? Be brief."
        ];
        return prompts[Math.floor(Math.random() * prompts.length)];
    }

    generateEncouragement(score) {
        return `Current score is ${score}. Generate a short encouraging message for the player.`;
    }

    generateGameOver(score) {
        return `Game over. Final score was ${score}. Generate a short encouraging message for the player.`;
    }

    // Main method for getting AI responses
    async getResponse(prompt) {
        return await this.generateContent(prompt);
    }
}

// TTS機能
class TTSService {
    constructor() {}

    speak(text, language = 'en') {
        // Use native Web Speech API
        this.speakNative(text, language + '-' + language.toUpperCase());
    }

    // Web Speech API を使用した代替TTS（ブラウザサポートがある場合）
    speakNative(text, lang = 'en-US') {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = 0.8;
            utterance.pitch = 1;
            speechSynthesis.speak(utterance);
            return true;
        }
        return false;
    }
}

// グローバルインスタンス
const geminiAI = new GeminiAI();
const ttsService = new TTSService();

