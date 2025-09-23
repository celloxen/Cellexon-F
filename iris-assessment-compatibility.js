// IRIS Assessment Data Structure Fix
// This ensures compatibility between the new image-enabled assessment and the therapy recommendation engine

// Add this function to your report-generator.html or as a separate module

function normalizeIrisAssessmentData(assessmentData) {
    // Ensure the assessment data has the expected structure
    const normalized = {
        id: assessmentData.id,
        patient_id: assessmentData.patient_id,
        clinic_id: assessmentData.clinic_id,
        created_at: assessmentData.created_at,
        
        // Ensure organ_analysis exists as an array
        organ_analysis: [],
        
        // Map the new structure to the expected format
        constitutional_findings: {},
        iris_signs: [],
        recommendations: []
    };
    
    // Convert new assessment format to expected format
    if (assessmentData.assessment_data) {
        // If data is stored in assessment_data JSON column
        const data = typeof assessmentData.assessment_data === 'string' 
            ? JSON.parse(assessmentData.assessment_data) 
            : assessmentData.assessment_data;
            
        normalized.constitutional_findings = data.findings || {};
        
        // Create organ_analysis from findings
        normalized.organ_analysis = convertFindingsToOrganAnalysis(data.findings);
        
    } else if (assessmentData.constitution_type) {
        // If data is stored in individual columns
        normalized.constitutional_findings = {
            constitution_type: assessmentData.constitution_type,
            fiber_density: assessmentData.fiber_density,
            pupil_size: assessmentData.pupil_size,
            collarette_position: assessmentData.collarette_position,
            lacunae: assessmentData.lacunae,
            stress_rings: assessmentData.stress_rings,
            clinical_notes: assessmentData.clinical_notes
        };
        
        // Create organ_analysis from individual fields
        normalized.organ_analysis = convertFindingsToOrganAnalysis(normalized.constitutional_findings);
    }
    
    // Add iris signs based on findings
    normalized.iris_signs = generateIrisSigns(normalized.constitutional_findings);
    
    // Add image data if present
    if (assessmentData.images) {
        normalized.images = assessmentData.images;
    }
    
    return normalized;
}

function convertFindingsToOrganAnalysis(findings) {
    const organAnalysis = [];
    
    // Map constitutional type to organ systems
    if (findings.constitution_type) {
        switch(findings.constitution_type) {
            case 'neurogenic':
                organAnalysis.push({
                    organ: 'Nervous System',
                    findings: ['High nervous system sensitivity', 'Stress response tendencies'],
                    severity: 'moderate',
                    location: 'Both eyes'
                });
                break;
            case 'polyglandular':
                organAnalysis.push({
                    organ: 'Endocrine System',
                    findings: ['Glandular imbalances', 'Hormonal fluctuations'],
                    severity: 'moderate',
                    location: 'Both eyes'
                });
                break;
            case 'connective_tissue':
                organAnalysis.push({
                    organ: 'Connective Tissue',
                    findings: ['Connective tissue weakness', 'Structural support needs'],
                    severity: 'moderate',
                    location: 'Both eyes'
                });
                break;
            case 'lymphatic':
                organAnalysis.push({
                    organ: 'Lymphatic System',
                    findings: ['Lymphatic congestion tendency', 'Immune system support needed'],
                    severity: 'moderate',
                    location: 'Both eyes'
                });
                break;
            case 'biliary':
                organAnalysis.push({
                    organ: 'Hepatobiliary System',
                    findings: ['Liver/gallbladder support needed', 'Digestive weakness'],
                    severity: 'moderate',
                    location: 'Both eyes'
                });
                break;
        }
    }
    
    // Add findings based on fiber density
    if (findings.fiber_density) {
        switch(findings.fiber_density) {
            case 'loose':
            case 'very_loose':
                organAnalysis.push({
                    organ: 'Constitutional Strength',
                    findings: ['Weak constitutional fibers', 'Need for constitutional support'],
                    severity: findings.fiber_density === 'very_loose' ? 'severe' : 'moderate',
                    location: 'Both eyes'
                });
                break;
            case 'tight':
                organAnalysis.push({
                    organ: 'Constitutional Strength',
                    findings: ['Strong constitutional fibers', 'Good inherent vitality'],
                    severity: 'mild',
                    location: 'Both eyes'
                });
                break;
        }
    }
    
    // Add findings based on pupil characteristics
    if (findings.pupil_size && findings.pupil_size !== 'normal') {
        organAnalysis.push({
            organ: 'Autonomic Nervous System',
            findings: [
                findings.pupil_size === 'miotic' ? 'Parasympathetic dominance' : 
                findings.pupil_size === 'mydriatic' ? 'Sympathetic dominance' : 
                'Autonomic imbalance'
            ],
            severity: 'moderate',
            location: 'Central zone'
        });
    }
    
    // Add findings based on stress rings
    if (findings.stress_rings && findings.stress_rings !== 'none') {
        const severity = findings.stress_rings === 'severe' ? 'severe' : 
                        findings.stress_rings === 'moderate' ? 'moderate' : 'mild';
        organAnalysis.push({
            organ: 'Stress Response System',
            findings: ['Chronic stress patterns', 'Nervous tension rings'],
            severity: severity,
            location: 'Peripheral zones'
        });
    }
    
    // Add findings based on lacunae
    if (findings.lacunae && findings.lacunae !== 'none') {
        const severity = findings.lacunae === 'many' ? 'moderate' : 'mild';
        organAnalysis.push({
            organ: 'Tissue Integrity',
            findings: ['Tissue weakness signs', 'Genetic predisposition markers'],
            severity: severity,
            location: 'Various zones'
        });
    }
    
    // Ensure we always return at least one analysis
    if (organAnalysis.length === 0) {
        organAnalysis.push({
            organ: 'General Constitution',
            findings: ['Constitutional assessment completed'],
            severity: 'mild',
            location: 'Both eyes'
        });
    }
    
    return organAnalysis;
}

function generateIrisSigns(findings) {
    const signs = [];
    
    if (findings.constitution_type) {
        signs.push({
            sign: 'Constitutional Type',
            description: `${findings.constitution_type} constitution identified`,
            significance: 'Indicates primary constitutional tendencies'
        });
    }
    
    if (findings.fiber_density) {
        signs.push({
            sign: 'Fiber Density',
            description: `${findings.fiber_density} fiber pattern observed`,
            significance: 'Indicates inherent constitutional strength'
        });
    }
    
    if (findings.stress_rings && findings.stress_rings !== 'none') {
        signs.push({
            sign: 'Stress Rings',
            description: `${findings.stress_rings} stress rings detected`,
            significance: 'Indicates nervous system tension'
        });
    }
    
    if (findings.lacunae && findings.lacunae !== 'none') {
        signs.push({
            sign: 'Lacunae',
            description: `${findings.lacunae} lacunae present`,
            significance: 'Indicates areas of tissue weakness'
        });
    }
    
    if (findings.collarette_position && findings.collarette_position !== 'central') {
        signs.push({
            sign: 'Collarette Position',
            description: `${findings.collarette_position} collarette position`,
            significance: 'Indicates autonomic nervous system balance'
        });
    }
    
    return signs;
}

// Updated function for report-generator.html
async function loadIrisAssessment(patientId) {
    try {
        // Try to load from session first
        let irisData = sessionStorage.getItem('irisAssessmentData');
        if (irisData) {
            return normalizeIrisAssessmentData(JSON.parse(irisData));
        }
        
        // Load from database
        const { data, error } = await supabase
            .from('iris_assessments')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (error) {
            console.warn('No IRIS assessment found:', error);
            return null;
        }
        
        // Normalize the data structure
        return normalizeIrisAssessmentData(data);
        
    } catch (error) {
        console.error('Error loading IRIS assessment:', error);
        return null;
    }
}

// Fix for the therapy recommendations engine call
async function generateTherapyRecommendations(patientData, healthData, irisData) {
    try {
        // Ensure iris data has the correct structure
        const normalizedIris = irisData ? normalizeIrisAssessmentData(irisData) : null;
        
        if (!normalizedIris || !normalizedIris.organ_analysis || normalizedIris.organ_analysis.length === 0) {
            console.warn('No valid IRIS organ analysis found, using default');
            // Create minimal structure if missing
            if (!normalizedIris) {
                normalizedIris = {
                    organ_analysis: [],
                    constitutional_findings: {},
                    iris_signs: []
                };
            }
            if (!normalizedIris.organ_analysis) {
                normalizedIris.organ_analysis = [];
            }
            if (normalizedIris.organ_analysis.length === 0) {
                normalizedIris.organ_analysis.push({
                    organ: 'General Health',
                    findings: ['Standard wellness support recommended'],
                    severity: 'mild',
                    location: 'General'
                });
            }
        }
        
        // Call the recommendation engine with normalized data
        const engine = new TherapyRecommendationEngine();
        return engine.generateRecommendations(patientData, healthData, normalizedIris);
        
    } catch (error) {
        console.error('Error in generateTherapyRecommendations:', error);
        // Return default recommendations on error
        return {
            recommendedTherapies: ['001', '301', '501'], // Default wellness protocols
            matchScores: {
                '001': 0.5,
                '301': 0.5,
                '501': 0.5
            },
            reasoning: 'Default wellness recommendations due to assessment data issue'
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normalizeIrisAssessmentData,
        convertFindingsToOrganAnalysis,
        generateIrisSigns,
        loadIrisAssessment,
        generateTherapyRecommendations
    };
}

// Make available globally
window.normalizeIrisAssessmentData = normalizeIrisAssessmentData;
window.loadIrisAssessment = loadIrisAssessment;
window.generateTherapyRecommendations = generateTherapyRecommendations;
