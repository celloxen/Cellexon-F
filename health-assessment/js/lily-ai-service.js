// Lily Health Consultant - AI Service for Predictive Questions
// Version without terminal requirements - uses intelligent fallback system
class LilyAIService {
    constructor() {
        // No API endpoint needed for this version
        this.useAI = false; // Set to true when backend is ready
    }

    async generatePredictiveQuestions(sessionData, categoryScores) {
        // For now, use intelligent fallback questions
        // These are specifically tailored based on the scores
        return this.getIntelligentFallbackQuestions(sessionData, categoryScores);
    }

    getIntelligentFallbackQuestions(sessionData, categoryScores) {
        // Determine which areas need most attention
        const sortedCategories = Object.entries(categoryScores)
            .sort(([,a], [,b]) => a - b);
        
        const lowestCategory = sortedCategories[0][0];
        const lowestScore = sortedCategories[0][1];
        const secondLowest = sortedCategories[1][0];
        
        // Age and gender specific adjustments
        const isElderly = sessionData.patientAge > 65;
        const isFemale = sessionData.patientGender === 'Female';
        const isMale = sessionData.patientGender === 'Male';
        
        let questions = [];
        
        // Add questions based on lowest scoring category
        if (lowestCategory === 'physical' && lowestScore < 50) {
            questions.push(...this.getSeverePhysicalQuestions(isElderly));
        } else if (lowestCategory === 'mental' && lowestScore < 50) {
            questions.push(...this.getSevereMentalQuestions());
        } else if (lowestCategory === 'lifestyle') {
            questions.push(...this.getLifestyleQuestions());
        }
        
        // Add gender-specific questions if relevant
        if (isFemale) {
            questions.push(...this.getFemaleSpecificQuestions());
        } else if (isMale) {
            questions.push(...this.getMaleSpecificQuestions());
        }
        
        // Add age-specific questions
        if (isElderly) {
            questions.push(...this.getElderlyQuestions());
        } else if (sessionData.patientAge < 30) {
            questions.push(...this.getYoungAdultQuestions());
        }
        
        // Fill remaining slots with general questions
        questions.push(...this.getGeneralFollowUpQuestions());
        
        // Ensure exactly 20 questions
        return questions.slice(0, 20).map((q, index) => ({
            ...q,
            id: index + 1
        }));
    }

    getSeverePhysicalQuestions(isElderly) {
        return [
            {
                question: "Where exactly do you experience the most pain or discomfort?",
                category: "physical",
                options: {
                    a: "Multiple areas with severe pain",
                    b: "Back and joints primarily",
                    c: "Head and neck area",
                    d: "Abdominal region",
                    e: "No specific pain location"
                },
                focus_area: "pain_location"
            },
            {
                question: "How long have you been experiencing these physical symptoms?",
                category: "physical",
                options: {
                    a: "More than 5 years",
                    b: "2-5 years",
                    c: "6 months to 2 years",
                    d: "Less than 6 months",
                    e: "Very recently"
                },
                focus_area: "symptom_duration"
            },
            {
                question: isElderly ? "Do you have difficulty with daily activities like dressing or bathing?" : "Does pain interfere with your work or daily activities?",
                category: "physical",
                options: {
                    a: "Completely unable to perform",
                    b: "Severe difficulty",
                    c: "Moderate difficulty",
                    d: "Mild difficulty",
                    e: "No difficulty"
                },
                focus_area: "functional_impact"
            }
        ];
    }

    getSevereMentalQuestions() {
        return [
            {
                question: "Have you experienced any trauma or significant life changes recently?",
                category: "mental",
                options: {
                    a: "Major trauma very recently",
                    b: "Significant changes in past year",
                    c: "Some stressful events",
                    d: "Minor life changes",
                    e: "No significant changes"
                },
                focus_area: "trauma_assessment"
            },
            {
                question: "How is your sleep pattern affected by your mental state?",
                category: "mental",
                options: {
                    a: "Cannot sleep at all",
                    b: "Less than 4 hours nightly",
                    c: "5-6 hours with interruptions",
                    d: "7-8 hours but not restful",
                    e: "Good quality sleep"
                },
                focus_area: "sleep_mental_health"
            },
            {
                question: "Do you have support from family or friends?",
                category: "mental",
                options: {
                    a: "Completely isolated",
                    b: "Very limited support",
                    c: "Some support available",
                    d: "Good support system",
                    e: "Excellent support network"
                },
                focus_area: "social_support"
            }
        ];
    }

    getLifestyleQuestions() {
        return [
            {
                question: "What is your primary barrier to maintaining a healthy lifestyle?",
                category: "lifestyle",
                options: {
                    a: "Severe physical limitations",
                    b: "Lack of time and energy",
                    c: "Financial constraints",
                    d: "Lack of knowledge",
                    e: "No significant barriers"
                },
                focus_area: "lifestyle_barriers"
            },
            {
                question: "How many hours do you spend sitting per day?",
                category: "lifestyle",
                options: {
                    a: "More than 12 hours",
                    b: "8-12 hours",
                    c: "6-8 hours",
                    d: "4-6 hours",
                    e: "Less than 4 hours"
                },
                focus_area: "sedentary_behaviour"
            }
        ];
    }

    getFemaleSpecificQuestions() {
        return [
            {
                question: "Do you experience symptoms related to your menstrual cycle?",
                category: "history",
                options: {
                    a: "Severe symptoms affecting daily life",
                    b: "Significant monthly symptoms",
                    c: "Moderate symptoms",
                    d: "Mild symptoms",
                    e: "No cycle-related issues"
                },
                focus_area: "hormonal_female"
            },
            {
                question: "Have you had any pregnancies or are you planning pregnancy?",
                category: "history",
                options: {
                    a: "Currently pregnant",
                    b: "Planning pregnancy soon",
                    c: "Previous pregnancies with complications",
                    d: "Previous pregnancies without issues",
                    e: "Not applicable"
                },
                focus_area: "reproductive_health"
            }
        ];
    }

    getMaleSpecificQuestions() {
        return [
            {
                question: "Do you experience any prostate-related symptoms?",
                category: "history",
                options: {
                    a: "Severe urinary problems",
                    b: "Frequent urinary issues",
                    c: "Occasional symptoms",
                    d: "Rare mild symptoms",
                    e: "No prostate issues"
                },
                focus_area: "prostate_health"
            }
        ];
    }

    getElderlyQuestions() {
        return [
            {
                question: "Have you had any falls in the past year?",
                category: "physical",
                options: {
                    a: "Multiple falls with injury",
                    b: "Several falls",
                    c: "One or two falls",
                    d: "Near falls only",
                    e: "No falls or balance issues"
                },
                focus_area: "fall_risk"
            },
            {
                question: "Are you taking multiple medications?",
                category: "history",
                options: {
                    a: "More than 10 medications",
                    b: "6-10 medications",
                    c: "3-5 medications",
                    d: "1-2 medications",
                    e: "No regular medications"
                },
                focus_area: "polypharmacy"
            }
        ];
    }

    getYoungAdultQuestions() {
        return [
            {
                question: "How do you manage stress from work or studies?",
                category: "mental",
                options: {
                    a: "Cannot cope at all",
                    b: "Very poor coping",
                    c: "Some coping strategies",
                    d: "Good stress management",
                    e: "Excellent coping skills"
                },
                focus_area: "stress_coping"
            }
        ];
    }

    getGeneralFollowUpQuestions() {
        return [
            {
                question: "How motivated are you to improve your health?",
                category: "mental",
                options: {
                    a: "Not motivated at all",
                    b: "Slightly motivated",
                    c: "Moderately motivated",
                    d: "Very motivated",
                    e: "Extremely motivated"
                },
                focus_area: "motivation"
            },
            {
                question: "Have you tried any therapies or treatments before?",
                category: "history",
                options: {
                    a: "Many treatments, no success",
                    b: "Several treatments, limited success",
                    c: "Some treatments, partial success",
                    d: "Few treatments, good results",
                    e: "No previous treatments"
                },
                focus_area: "treatment_history"
            },
            {
                question: "How would you rate your overall quality of life?",
                category: "lifestyle",
                options: {
                    a: "Very poor",
                    b: "Poor",
                    c: "Fair",
                    d: "Good",
                    e: "Excellent"
                },
                focus_area: "quality_of_life"
            },
            {
                question: "Do you have any allergies or sensitivities?",
                category: "history",
                options: {
                    a: "Multiple severe allergies",
                    b: "Several allergies",
                    c: "Few allergies",
                    d: "Mild sensitivities only",
                    e: "No known allergies"
                },
                focus_area: "allergies"
            },
            {
                question: "How often do you engage in relaxation or mindfulness practices?",
                category: "lifestyle",
                options: {
                    a: "Never",
                    b: "Rarely",
                    c: "Sometimes",
                    d: "Often",
                    e: "Daily"
                },
                focus_area: "relaxation"
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
