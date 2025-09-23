// Therapy Recommendation Engine for Celloxen Platform
// Automatically generates therapy recommendations based on assessment findings

export class TherapyRecommendationEngine {
    constructor() {
        // Define therapy codes and their applications
        this.therapyCodes = {
            // Frequency Therapies
            'FRQ-001': { 
                name: 'Stress Relief Frequency', 
                category: 'Frequency',
                targets: ['stress', 'anxiety', 'sleep'],
                duration: 30,
                priority: 1
            },
            'FRQ-002': { 
                name: 'Sleep Optimization Frequency', 
                category: 'Frequency',
                targets: ['sleep', 'insomnia', 'circadian'],
                duration: 45,
                priority: 1
            },
            'FRQ-003': { 
                name: 'Energy Enhancement Frequency', 
                category: 'Frequency',
                targets: ['energy', 'fatigue', 'vitality'],
                duration: 30,
                priority: 2
            },
            
            // Light Therapies
            'LGT-001': { 
                name: 'Red Light Therapy', 
                category: 'Light',
                targets: ['inflammation', 'joint', 'pain'],
                duration: 20,
                priority: 1
            },
            'LGT-002': { 
                name: 'Blue Light Therapy', 
                category: 'Light',
                targets: ['skin', 'mood', 'circadian'],
                duration: 15,
                priority: 2
            },
            'LGT-003': { 
                name: 'Infrared Therapy', 
                category: 'Light',
                targets: ['circulation', 'muscle', 'recovery'],
                duration: 30,
                priority: 2
            },
            
            // PEMF Therapies
            'PMF-001': { 
                name: 'Joint Recovery PEMF', 
                category: 'PEMF',
                targets: ['joint', 'arthritis', 'mobility'],
                duration: 30,
                priority: 1
            },
            'PMF-002': { 
                name: 'Cellular Regeneration PEMF', 
                category: 'PEMF',
                targets: ['cellular', 'recovery', 'healing'],
                duration: 45,
                priority: 2
            },
            
            // Ozone Therapies
            'OZN-001': { 
                name: 'Immune Boost Ozone', 
                category: 'Ozone',
                targets: ['immune', 'infection', 'detox'],
                duration: 45,
                priority: 1
            },
            'OZN-002': { 
                name: 'Oxygen Enhancement', 
                category: 'Ozone',
                targets: ['oxygen', 'energy', 'cellular'],
                duration: 30,
                priority: 2
            },
            
            // IV Therapies
            'IVT-001': { 
                name: 'Myers Cocktail IV', 
                category: 'IV',
                targets: ['nutrition', 'energy', 'immune'],
                duration: 60,
                priority: 2
            },
            'IVT-002': { 
                name: 'Glutathione IV', 
                category: 'IV',
                targets: ['detox', 'antioxidant', 'liver'],
                duration: 45,
                priority: 2
            },
            'IVT-003': { 
                name: 'Vitamin C IV', 
                category: 'IV',
                targets: ['immune', 'antioxidant', 'energy'],
                duration: 45,
                priority: 1
            },
            
            // Hyperbaric Oxygen
            'HBO-001': { 
                name: 'Hyperbaric Oxygen Session', 
                category: 'Hyperbaric',
                targets: ['healing', 'brain', 'oxygen'],
                duration: 90,
                priority: 3
            },
            
            // Cryotherapy
            'CRY-001': { 
                name: 'Whole Body Cryotherapy', 
                category: 'Cryo',
                targets: ['inflammation', 'recovery', 'pain'],
                duration: 3,
                priority: 2
            },
            
            // Infrared Sauna
            'SAU-001': { 
                name: 'Infrared Sauna Detox', 
                category: 'Sauna',
                targets: ['detox', 'circulation', 'relaxation'],
                duration: 45,
                priority: 3
            }
        };
        
        // Priority levels
        this.priorityLevels = {
            1: 'MANDATORY - PRIMARY',
            2: 'RECOMMENDED - SECONDARY',
            3: 'OPTIONAL - SUPPORTIVE'
        };
    }
    
    async generateRecommendations(healthAssessment, irisAssessment) {
        const recommendations = [];
        const problemDomains = [];
        
        // Analyze health assessment scores
        if (healthAssessment?.scores) {
            for (const [domain, score] of Object.entries(healthAssessment.scores)) {
                if (score > 50) {
                    problemDomains.push({
                        domain: domain,
                        severity: score,
                        type: 'health'
                    });
                }
            }
        }
        
        // Analyze IRIS assessment findings
        if (irisAssessment?.organ_analysis) {
            irisAssessment.organ_analysis.forEach(organ => {
                if (organ.status !== 'Normal' && organ.status !== 'Good') {
                    problemDomains.push({
                        domain: organ.name.toLowerCase(),
                        severity: 60,
                        type: 'iris'
                    });
                }
            });
        }
        
        // Constitutional type considerations
        if (irisAssessment?.constitutional_type) {
            const constitutionalTherapies = this.getConstitutionalTherapies(irisAssessment.constitutional_type);
            constitutionalTherapies.forEach(code => {
                if (!recommendations.find(r => r.code === code)) {
                    const therapy = this.therapyCodes[code];
                    recommendations.push({
                        id: code,
                        code: code,
                        name: therapy.name,
                        description: `${therapy.category} therapy for ${irisAssessment.constitutional_type} constitution`,
                        duration: therapy.duration,
                        priority: this.priorityLevels[therapy.priority],
                        category: therapy.category
                    });
                }
            });
        }
        
        // Match therapies to problem domains
        problemDomains.forEach(problem => {
            const matchedTherapies = this.matchTherapiesToDomain(problem);
            matchedTherapies.forEach(code => {
                if (!recommendations.find(r => r.code === code)) {
                    const therapy = this.therapyCodes[code];
                    const priorityBoost = problem.severity > 70 ? -1 : 0;
                    const finalPriority = Math.max(1, therapy.priority + priorityBoost);
                    
                    recommendations.push({
                        id: code,
                        code: code,
                        name: therapy.name,
                        description: `${therapy.category} therapy for ${problem.domain} issues`,
                        duration: therapy.duration,
                        priority: this.priorityLevels[finalPriority],
                        category: therapy.category,
                        targetDomain: problem.domain
                    });
                }
            });
        });
        
        // Sort by priority
        recommendations.sort((a, b) => {
            const priorityA = Object.keys(this.priorityLevels).find(key => 
                this.priorityLevels[key] === a.priority);
            const priorityB = Object.keys(this.priorityLevels).find(key => 
                this.priorityLevels[key] === b.priority);
            return priorityA - priorityB;
        });
        
        // Limit to top 6 recommendations
        return recommendations.slice(0, 6);
    }
    
    matchTherapiesToDomain(problem) {
        const matches = [];
        const searchTerms = this.getDomainSearchTerms(problem.domain);
        
        for (const [code, therapy] of Object.entries(this.therapyCodes)) {
            const hasMatch = therapy.targets.some(target => 
                searchTerms.some(term => target.includes(term))
            );
            
            if (hasMatch) {
                matches.push(code);
            }
        }
        
        return matches;
    }
    
    getDomainSearchTerms(domain) {
        const searchMap = {
            'sleep': ['sleep', 'insomnia', 'circadian'],
            'stress': ['stress', 'anxiety', 'relaxation'],
            'cardiovascular': ['circulation', 'oxygen', 'cellular'],
            'joint': ['joint', 'arthritis', 'mobility', 'pain'],
            'digestive': ['digestive', 'detox', 'liver'],
            'kidney': ['detox', 'cellular', 'oxygen'],
            'energy': ['energy', 'fatigue', 'vitality'],
            'metabolic': ['metabolic', 'cellular', 'nutrition'],
            'lymphatic': ['lymph', 'detox', 'immune'],
            'nervous': ['nervous', 'stress', 'brain']
        };
        
        return searchMap[domain.toLowerCase()] || [domain.toLowerCase()];
    }
    
    getConstitutionalTherapies(constitutionalType) {
        const therapyMap = {
            'Lymphatic': ['OZN-001', 'SAU-001', 'LGT-003'],
            'Haematogenic': ['LGT-001', 'HBO-001', 'IVT-003'],
            'Biliary': ['IVT-002', 'OZN-002', 'SAU-001'],
            'Mixed': ['FRQ-001', 'PMF-002', 'IVT-001']
        };
        
        return therapyMap[constitutionalType] || ['FRQ-001', 'PMF-002'];
    }
    
    async getTherapyProtocols(therapyCodes) {
        // In production, this would fetch from database
        // For now, return the therapy details
        return therapyCodes.map(code => {
            const therapy = this.therapyCodes[code];
            return {
                code: code,
                ...therapy,
                protocol: this.generateProtocol(therapy)
            };
        });
    }
    
    generateProtocol(therapy) {
        return {
            frequency: '2-3 times per week',
            duration: `${therapy.duration} minutes per session`,
            totalSessions: 10,
            notes: `Monitor patient response and adjust as needed`
        };
    }
}

// Export for use in other modules
export default TherapyRecommendationEngine;
