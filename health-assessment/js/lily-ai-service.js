// Lily Health Consultant - AI Service for Predictive Questions
class LilyAIService {
    constructor() {
        this.apiEndpoint = 'https://api.anthropic.com/v1/messages';
        this.model = 'claude-sonnet-4-20250514';
    }

    async generatePredictiveQuestions(sessionData, categoryScores) {
        const prompt = this.buildPredictivePrompt(sessionData, categoryScores);
        
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 3000,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            const responseText = data.content[0].text;
            
            // Extract JSON from response
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const questions = JSON.parse(jsonMatch[0]);
                return this.validateQuestions(questions);
            }
            
            return this.getFallbackQuestions(sessionData, categoryScores);
        } catch (error) {
            console.error('Error generating predictive questions:', error);
            return this.getFallbackQuestions(sessionData, categoryScores);
        }
    }

    buildPredictivePrompt(sessionData, categoryScores) {
        const lowestCategories = Object.entries(categoryScores)
            .sort(([,a], [,b]) => a - b)
            .slice(0, 2)
            .map(([cat,]) => cat);

        return `Generate 20 targeted follow-up health assessment questions for a ${sessionData.patientAge} year old ${sessionData.patientGender} patient.

Patient Assessment Scores:
- Physical Health: ${categoryScores.physical}%
- Mental Health: ${categoryScores.mental}%
- Lifestyle: ${categoryScores.lifestyle}%
- Environment: ${categoryScores.environment}%
- Medical History: ${categoryScores.history}%

Primary Concerns: ${lowestCategories.join(', ')}

Generate 20 specific questions focusing on the lowest scoring areas to determine appropriate therapy protocols.

Return ONLY a JSON array in this exact format:
[
  {
    "id": 1,
    "question": "Specific question text",
    "category": "physical/mental/lifestyle/environment/history",
    "options": {
      "a": "Most severe option",
      "b": "Moderate-severe option",
      "c": "Moderate option",
      "d": "Mild option",
      "e": "No issue/best option"
    },
    "focus_area": "specific symptom or condition"
  }
]

Requirements:
- Questions must be age and gender appropriate
- Use British English spelling
- Focus on therapy selection criteria
- Options must progress from worst (a) to best (e)
- Professional medical terminology
- Each question should help identify specific therapy needs`;
    }

    validateQuestions(questions) {
        // Validate structure of generated questions
        const validQuestions = questions.filter(q => 
            q.question && 
            q.category && 
            q.options && 
            Object.keys(q.options).length === 5
        );

        if (validQuestions.length < 20) {
            // Pad with fallback questions if needed
            const fallback = this.getFallbackQuestions();
            return [...validQuestions, ...fallback.slice(0, 20 - validQuestions.length)];
        }

        return validQuestions.slice(0, 20);
    }

    getFallbackQuestions(sessionData, categoryScores) {
        // Comprehensive fallback questions if API fails
        return [
            {
                id: 1,
                question: "How frequently do you experience headaches or migraines?",
                category: "physical",
                options: {
                    a: "Daily severe headaches",
                    b: "Several times per week",
                    c: "Weekly headaches",
                    d: "Occasional mild headaches",
                    e: "Rarely or never"
                },
                focus_area: "neurological/pain"
            },
            {
                id: 2,
                question: "How would you describe your joint mobility and flexibility?",
                category: "physical",
                options: {
                    a: "Severe stiffness and limited mobility",
                    b: "Significant stiffness most days",
                    c: "Moderate stiffness sometimes",
                    d: "Mild occasional stiffness",
                    e: "Excellent flexibility"
                },
                focus_area: "musculoskeletal"
            },
            {
                id: 3,
                question: "Do you experience digestive issues such as bloating or discomfort?",
                category: "physical",
                options: {
                    a: "Severe daily digestive problems",
                    b: "Frequent digestive issues",
                    c: "Occasional digestive discomfort",
                    d: "Rare mild issues",
                    e: "No digestive problems"
                },
                focus_area: "digestive"
            },
            {
                id: 4,
                question: "How is your circulation in your extremities?",
                category: "physical",
                options: {
                    a: "Very poor - always cold/numb",
                    b: "Poor circulation often",
                    c: "Sometimes cold hands/feet",
                    d: "Generally good circulation",
                    e: "Excellent circulation"
                },
                focus_area: "cardiovascular"
            },
            {
                id: 5,
                question: "Do you experience anxiety in social situations?",
                category: "mental",
                options: {
                    a: "Severe social anxiety - avoid situations",
                    b: "High anxiety in most social settings",
                    c: "Moderate anxiety sometimes",
                    d: "Mild occasional nervousness",
                    e: "Comfortable in all social situations"
                },
                focus_area: "anxiety"
            },
            {
                id: 6,
                question: "How often do you feel overwhelmed by daily tasks?",
                category: "mental",
                options: {
                    a: "Constantly overwhelmed",
                    b: "Very often overwhelmed",
                    c: "Sometimes overwhelmed",
                    d: "Occasionally overwhelmed",
                    e: "Rarely feel overwhelmed"
                },
                focus_area: "stress management"
            },
            {
                id: 7,
                question: "How would you rate your memory and cognitive function?",
                category: "mental",
                options: {
                    a: "Severe memory problems",
                    b: "Frequent forgetfulness",
                    c: "Occasional memory lapses",
                    d: "Good memory most times",
                    e: "Excellent memory"
                },
                focus_area: "cognitive"
            },
            {
                id: 8,
                question: "Do you experience muscle tension or spasms?",
                category: "physical",
                options: {
                    a: "Severe daily muscle issues",
                    b: "Frequent muscle tension",
                    c: "Occasional muscle tightness",
                    d: "Rare mild tension",
                    e: "No muscle issues"
                },
                focus_area: "musculoskeletal"
            },
            {
                id: 9,
                question: "How is your breathing during physical activity?",
                category: "physical",
                options: {
                    a: "Severe shortness of breath",
                    b: "Often breathless",
                    c: "Sometimes short of breath",
                    d: "Mild breathlessness occasionally",
                    e: "Excellent breathing capacity"
                },
                focus_area: "respiratory"
            },
            {
                id: 10,
                question: "Do you experience skin conditions or sensitivities?",
                category: "physical",
                options: {
                    a: "Severe chronic skin conditions",
                    b: "Frequent skin problems",
                    c: "Occasional skin issues",
                    d: "Rare minor skin concerns",
                    e: "Healthy skin"
                },
                focus_area: "dermatological"
            },
            {
                id: 11,
                question: "How often do you experience fatigue after meals?",
                category: "lifestyle",
                options: {
                    a: "Always exhausted after eating",
                    b: "Often tired after meals",
                    c: "Sometimes drowsy",
                    d: "Occasionally tired",
                    e: "Good energy after meals"
                },
                focus_area: "metabolic"
            },
            {
                id: 12,
                question: "How would you rate your recovery after physical activity?",
                category: "lifestyle",
                options: {
                    a: "Very poor - days to recover",
                    b: "Slow recovery",
                    c: "Average recovery time",
                    d: "Good recovery",
                    e: "Excellent quick recovery"
                },
                focus_area: "fitness"
            },
            {
                id: 13,
                question: "Do you experience hormonal imbalances or related symptoms?",
                category: "history",
                options: {
                    a: "Severe hormonal issues",
                    b: "Significant hormonal symptoms",
                    c: "Some hormonal fluctuations",
                    d: "Minor occasional symptoms",
                    e: "No hormonal concerns"
                },
                focus_area: "endocrine"
            },
            {
                id: 14,
                question: "How often do you experience back pain?",
                category: "physical",
                options: {
                    a: "Constant severe back pain",
                    b: "Daily back pain",
                    c: "Weekly back discomfort",
                    d: "Occasional mild pain",
                    e: "No back pain"
                },
                focus_area: "spinal"
            },
            {
                id: 15,
                question: "Do you have difficulty with temperature regulation?",
                category: "environment",
                options: {
                    a: "Severe temperature sensitivity",
                    b: "Often too hot or cold",
                    c: "Sometimes uncomfortable",
                    d: "Mild sensitivity",
                    e: "Comfortable in all temperatures"
                },
                focus_area: "thermoregulation"
            },
            {
                id: 16,
                question: "How often do you experience inflammation or swelling?",
                category: "physical",
                options: {
                    a: "Constant inflammation",
                    b: "Frequent swelling",
                    c: "Occasional inflammation",
                    d: "Rare mild swelling",
                    e: "No inflammation issues"
                },
                focus_area: "inflammatory"
            },
            {
                id: 17,
                question: "Do you experience issues with balance or coordination?",
                category: "physical",
                options: {
                    a: "Severe balance problems",
                    b: "Frequent unsteadiness",
                    c: "Occasional balance issues",
                    d: "Rare minor issues",
                    e: "Excellent balance"
                },
                focus_area: "neurological"
            },
            {
                id: 18,
                question: "How would you rate your immune system function?",
                category: "history",
                options: {
                    a: "Constantly ill",
                    b: "Frequently sick",
                    c: "Average immune function",
                    d: "Rarely get sick",
                    e: "Excellent immunity"
                },
                focus_area: "immune"
            },
            {
                id: 19,
                question: "Do you experience water retention or lymphatic issues?",
                category: "physical",
                options: {
                    a: "Severe fluid retention",
                    b: "Frequent swelling/retention",
                    c: "Occasional water retention",
                    d: "Rare mild retention",
                    e: "No retention issues"
                },
                focus_area: "lymphatic"
            },
            {
                id: 20,
                question: "How often do you experience mood swings?",
                category: "mental",
                options: {
                    a: "Constant severe mood swings",
                    b: "Frequent mood changes",
                    c: "Occasional mood fluctuations",
                    d: "Rare mild changes",
                    e: "Stable mood"
                },
                focus_area: "emotional regulation"
            }
        ];
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LilyAIService;
} else {
    window.LilyAIService = LilyAIService;
}
