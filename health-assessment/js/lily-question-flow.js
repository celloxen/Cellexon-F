// Lily Health Consultant - Question Flow and Assessment Logic
class LilyQuestionFlow {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.currentQuestions = [];
        this.responses = new Map();
        this.categoryScores = {};
        this.totalScore = 0;
        this.contraindications = [];
        this.recommendedTherapies = [];
    }

    async loadGeneralQuestions() {
        try {
            const { data: questions, error } = await this.supabase
                .from('assessment_questions')
                .select('*')
                .order('order_position');

            if (error) throw error;
            
            this.currentQuestions = questions;
            return questions;
        } catch (error) {
            console.error('Error loading questions:', error);
            return [];
        }
    }

    async saveResponse(sessionId, questionId, response, responseText = '') {
        const score = this.calculateResponseScore(response);
        
        try {
            const { error } = await this.supabase
                .from('assessment_responses')
                .insert({
                    session_id: sessionId,
                    question_id: questionId,
                    response_value: response,
                    response_text: responseText,
                    response_score: score
                });

            if (error) throw error;
            
            // Store locally for immediate use
            this.responses.set(questionId, {
                response: response,
                score: score,
                text: responseText
            });

            return true;
        } catch (error) {
            console.error('Error saving response:', error);
            return false;
        }
    }

    calculateResponseScore(response) {
        // Convert letter responses to scores (a=1, b=2, c=3, d=4, e=5)
        const scoreMap = {
            'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5
        };
        
        return scoreMap[response.toLowerCase()] || 3;
    }

    calculateCategoryScores() {
        const categoryTotals = {
            physical: { total: 0, count: 0, weight: 0 },
            mental: { total: 0, count: 0, weight: 0 },
            lifestyle: { total: 0, count: 0, weight: 0 },
            environment: { total: 0, count: 0, weight: 0 },
            history: { total: 0, count: 0, weight: 0 }
        };

        // Calculate weighted scores for each category
        this.currentQuestions.forEach(question => {
            const response = this.responses.get(question.id);
            if (response) {
                const category = question.category;
                const weightedScore = response.score * question.weight;
                
                categoryTotals[category].total += weightedScore;
                categoryTotals[category].count += 1;
                categoryTotals[category].weight += question.weight;
            }
        });

        // Convert to percentage scores
        Object.keys(categoryTotals).forEach(category => {
            const cat = categoryTotals[category];
            if (cat.count > 0) {
                // Calculate as percentage (max possible score = 5 * total_weight)
                const maxPossible = 5 * cat.weight;
                this.categoryScores[category] = Math.round((cat.total / maxPossible) * 100);
            } else {
                this.categoryScores[category] = 0;
            }
        });

        // Calculate overall score
        const scores = Object.values(this.categoryScores);
        this.totalScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        return this.categoryScores;
    }

    checkContraindications(sessionData) {
        const contraindications = [];
        
        // Age check (already handled in main flow)
        if (sessionData.patientAge < 12) {
            contraindications.push({
                type: 'absolute',
                condition: 'Children Under 12 Years',
                reason: 'Developing nervous system, unable to communicate discomfort effectively'
            });
        }

        // Check for concerning responses that may indicate contraindications
        this.currentQuestions.forEach(question => {
            const response = this.responses.get(question.id);
            if (response && response.score <= 2) { // Very low scores may indicate serious issues
                
                if (question.question_text.toLowerCase().includes('pain') && response.response === 'a') {
                    contraindications.push({
                        type: 'relative',
                        condition: 'Severe Pain Condition',
                        reason: 'Requires medical evaluation before therapy'
                    });
                }
                
                if (question.question_text.toLowerCase().includes('medical conditions') && response.response === 'a') {
                    contraindications.push({
                        type: 'relative',
                        condition: 'Multiple Serious Medical Conditions',
                        reason: 'Requires physician clearance'
                    });
                }
            }
        });

        this.contraindications = contraindications;
        return contraindications;
    }

    async generateTherapyRecommendations() {
        const therapyCategories = {
            'Musculoskeletal & Pain Management': ['101', '102', '103', '401', '402', '403'],
            'Cardiovascular & Circulation': ['301', '302', '303'],
            'Digestive & Metabolism': ['201', '202', '203', '204'],
            'Respiratory & Immune': ['501', '502', '503'],
            'Neurological & Mental Health': ['601', '602', '603'],
            'Energy & Vitality': ['701', '702', '703']
        };

        const recommendations = [];
        
        // Find lowest scoring categories for primary recommendations
        const sortedCategories = Object.entries(this.categoryScores)
            .sort(([,a], [,b]) => a - b)
            .slice(0, 3); // Top 3 areas needing improvement

        sortedCategories.forEach(([category, score]) => {
            if (score < 70) { // Only recommend for categories scoring below 70%
                let therapyArea = '';
                
                switch(category) {
                    case 'physical':
                        therapyArea = 'Musculoskeletal & Pain Management';
                        break;
                    case 'mental':
                        therapyArea = 'Neurological & Mental Health';
                        break;
                    case 'lifestyle':
                        therapyArea = 'Energy & Vitality';
                        break;
                    case 'environment':
                        therapyArea = 'Respiratory & Immune';
                        break;
                    case 'history':
                        therapyArea = 'Cardiovascular & Circulation';
                        break;
                }

                if (therapyArea && therapyCategories[therapyArea]) {
                    recommendations.push({
                        category: therapyArea,
                        codes: therapyCategories[therapyArea],
                        priority: score < 50 ? 'essential' : 'recommended',
                        reason: `${category} health scored ${score}% - requires attention`
                    });
                }
            }
        });

        this.recommendedTherapies = recommendations;
        return recommendations;
    }

    async generatePredictiveQuestions(sessionData) {
        // Use Claude API to generate personalised follow-up questions
        const prompt = `Based on the health assessment responses, generate 20 targeted follow-up questions for ${sessionData.patientName} (${sessionData.patientAge} year old ${sessionData.patientGender}).

Assessment Scores:
- Physical Health: ${this.categoryScores.physical}%
- Mental Health: ${this.categoryScores.mental}%
- Lifestyle: ${this.categoryScores.lifestyle}%
- Environment: ${this.categoryScores.environment}%
- Medical History: ${this.categoryScores.history}%

Focus on the lowest scoring areas and generate specific, targeted questions that will help determine the best therapy protocols. 

Format as JSON array with this structure:
[
  {
    "question": "question text",
    "category": "category name",
    "options": {
      "a": "option 1",
      "b": "option 2", 
      "c": "option 3",
      "d": "option 4",
      "e": "option 5"
    },
    "focus_area": "specific condition or symptom"
  }
]

Ensure questions are:
- Clinically relevant for therapy selection
- Age and gender appropriate
- Focused on areas with lowest scores
- Multiple choice format
- Professional medical language`;

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 2000,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            const data = await response.json();
            const questions = JSON.parse(data.content[0].text);
            
            return questions;
        } catch (error) {
            console.error('Error generating predictive questions:', error);
            // Return fallback questions if API fails
            return this.getFallbackPredictiveQuestions();
        }
    }

    getFallbackPredictiveQuestions() {
        return [
            {
                question: "How often do you experience headaches?",
                category: "physical",
                options: {
                    a: "Daily severe headaches",
                    b: "Several times per week",
                    c: "Weekly headaches",
                    d: "Occasional headaches",
                    e: "Rarely or never"
                },
                focus_area: "pain management"
            },
            {
                question: "How is your circulation in hands and feet?",
                category: "physical", 
                options: {
                    a: "Very poor - always cold",
                    b: "Poor circulation",
                    c: "Sometimes cold",
                    d: "Generally good",
                    e: "Excellent circulation"
                },
                focus_area: "cardiovascular"
            }
            // Add 18 more fallback questions as needed
        ];
    }

    async saveSessionResults(sessionId) {
        try {
            const { error } = await this.supabase
                .from('lily_assessment_sessions')
                .update({
                    general_responses: Object.fromEntries(this.responses),
                    category_scores: this.categoryScores,
                    total_score: this.totalScore,
                    contraindications_found: this.contraindications,
                    recommended_therapies: this.recommendedTherapies,
                    current_step: 'general_complete'
                })
                .eq('session_id', sessionId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error saving session results:', error);
            return false;
        }
    }
}

// Export for use in main Lily application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LilyQuestionFlow;
} else {
    window.LilyQuestionFlow = LilyQuestionFlow;
}
