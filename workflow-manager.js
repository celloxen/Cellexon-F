// workflow-manager.js - Fixed with proper initialization and exports
import { supabase, supabaseReady } from './supabase-config.js';

// Export workflowStages as constant (required by lily-ai-agent-integrated.html)
export const workflowStages = {
    REGISTERED: 'registered',
    HEALTH_ASSESSMENT: 'health_assessment',
    IRIS_ASSESSMENT: 'iris_assessment',
    REPORT_GENERATION: 'report_generation',
    TREATMENT_PLANNING: 'treatment_planning',
    TREATMENT_SCHEDULING: 'treatment_scheduling',
    IN_TREATMENT: 'in_treatment',
    COMPLETED: 'completed',
    MAINTENANCE: 'maintenance'
};

class WorkflowManager {
    constructor() {
        this.currentPatient = null;
        this.currentStage = null;
        this.validStages = Object.values(workflowStages);
        this.isReady = false;
        this.init();
    }
    
    async init() {
        // Wait for supabase to be ready
        await supabaseReady;
        this.isReady = true;
        console.log('Workflow Manager initialized');
    }
    
    // Continue assessment - main entry point from patient registration
    async continueAssessment(patientId) {
        sessionStorage.setItem('currentPatientId', patientId);
        // Direct to Lily AI for health assessment
        window.location.href = `lily-ai-agent-integrated.html?patientId=${patientId}`;
    }
    
    // Update workflow stage with database fallback
    async updateStage(patientId, newStage) {
        try {
            // Always update session storage first
            sessionStorage.setItem('workflow_stage', newStage);
            
            if (!this.validStages.includes(newStage)) {
                console.warn(`Invalid stage: ${newStage}`);
                return true; // Continue anyway
            }
            
            // Wait for initialization
            if (!this.isReady) await this.init();
            
            const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
            const clinicId = authData.clinicId || sessionStorage.getItem('currentClinicId') || 1;
            
            // Try database update but don't let it block
            try {
                // Check if record exists
                const { data: existing } = await supabase
                    .from('patient_workflow_status')
                    .select('*')
                    .eq('patient_id', patientId)
                    .single();
                
                if (!existing) {
                    // Insert new record
                    await supabase
                        .from('patient_workflow_status')
                        .insert([{
                            clinic_id: parseInt(clinicId),
                            patient_id: parseInt(patientId),
                            current_stage: newStage,
                            updated_at: new Date().toISOString()
                        }]);
                } else {
                    // Update existing record
                    await supabase
                        .from('patient_workflow_status')
                        .update({
                            current_stage: newStage,
                            updated_at: new Date().toISOString()
                        })
                        .eq('patient_id', patientId);
                }
            } catch (dbError) {
                console.log('Database update skipped:', dbError.message);
                // Continue with session storage only
            }
            
            console.log(`Workflow updated: Patient ${patientId} -> ${newStage}`);
            return true;
        } catch (error) {
            console.error('Workflow update error:', error);
            return true; // Always return true to continue flow
        }
    }
    
    // Initialize workflow for new patient
    async initializeWorkflow(patientId) {
        try {
            sessionStorage.setItem('currentPatientId', patientId);
            sessionStorage.setItem('workflow_stage', workflowStages.REGISTERED);
            
            // Try database but don't block
            if (this.isReady) {
                const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
                const clinicId = authData.clinicId || sessionStorage.getItem('currentClinicId');
                
                if (clinicId) {
                    try {
                        await supabase
                            .from('patient_workflow_status')
                            .insert([{
                                clinic_id: parseInt(clinicId),
                                patient_id: parseInt(patientId),
                                current_stage: workflowStages.REGISTERED,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            }]);
                    } catch (e) {
                        console.log('Workflow init in session only');
                    }
                }
            }
            
            return {
                patient_id: patientId,
                current_stage: workflowStages.REGISTERED
            };
        } catch (error) {
            console.error('Error initializing workflow:', error);
            return {
                patient_id: patientId,
                current_stage: workflowStages.REGISTERED
            };
        }
    }
    
    // Complete health assessment (called by Lily)
    async completeHealthAssessment(patientId, assessmentData) {
        try {
            await this.updateStage(patientId, workflowStages.HEALTH_ASSESSMENT);
            
            // Store assessment data
            sessionStorage.setItem('lastHealthAssessment', JSON.stringify({
                patientId: patientId,
                data: assessmentData,
                timestamp: new Date().toISOString()
            }));
            
            return assessmentData;
        } catch (error) {
            console.error('Error completing health assessment:', error);
            return assessmentData;
        }
    }
    
    // Complete IRIS assessment
    async completeIrisAssessment(patientId, irisData) {
        try {
            await this.updateStage(patientId, workflowStages.IRIS_ASSESSMENT);
            
            sessionStorage.setItem('lastIrisAssessment', JSON.stringify({
                patientId: patientId,
                data: irisData,
                timestamp: new Date().toISOString()
            }));
            
            // Check if health assessment is also complete
            const healthData = sessionStorage.getItem('lastHealthAssessment');
            if (healthData) {
                const health = JSON.parse(healthData);
                if (health.patientId === patientId) {
                    // Both complete - move to report generation
                    await this.updateStage(patientId, workflowStages.REPORT_GENERATION);
                }
            }
            
            return irisData;
        } catch (error) {
            console.error('Error completing IRIS assessment:', error);
            return irisData;
        }
    }
    
    // Get workflow status
    async getWorkflowStatus(patientId) {
        try {
            // First check session
            const sessionStage = sessionStorage.getItem('workflow_stage');
            if (sessionStage) {
                return { current_stage: sessionStage };
            }
            
            // Try database if ready
            if (this.isReady) {
                const { data } = await supabase
                    .from('patient_workflow_status')
                    .select('*')
                    .eq('patient_id', patientId)
                    .single();
                
                if (data) return data;
            }
            
            return { current_stage: workflowStages.REGISTERED };
        } catch (error) {
            return { current_stage: workflowStages.REGISTERED };
        }
    }
    
    // Navigate to appropriate page based on stage
    navigateToStage(patientId, stage) {
        const routes = {
            'registered': `patient-registration.html?id=${patientId}`,
            'health_assessment': `lily-ai-agent-integrated.html?patientId=${patientId}`,
            'iris_assessment': `iris-assessment-integrated.html?patientId=${patientId}`,
            'report_generation': `report-generator.html?patientId=${patientId}`,
            'treatment_planning': `treatment-planning-enhanced.html?patientId=${patientId}`,
            'treatment_scheduling': `treatment-scheduler-auto.html?patientId=${patientId}`,
            'in_treatment': `clinic-dashboard.html`
        };
        
        const route = routes[stage];
        if (route) {
            window.location.href = route;
        }
    }
    
    // Generate report
    async generateReport(patientId) {
        try {
            await this.updateStage(patientId, workflowStages.REPORT_GENERATION);
            
            sessionStorage.setItem('lastAssessedPatientId', patientId);
            sessionStorage.setItem('lastAssessmentId', Date.now().toString());
            
            // Redirect to report generator
            setTimeout(() => {
                window.location.href = `report-generator.html?patientId=${patientId}&autoGenerate=true`;
            }, 1000);
            
            return true;
        } catch (error) {
            console.error('Error generating report:', error);
            return false;
        }
    }
    
    // Get patient details
    async getPatientDetails(patientId) {
        try {
            if (!this.isReady) await this.init();
            
            const { data: patient, error } = await supabase
                .from('patients')
                .select('*')
                .eq('id', patientId)
                .single();
            
            if (error) throw error;
            return patient;
        } catch (error) {
            console.error('Error getting patient details:', error);
            return null;
        }
    }
}

// Create singleton instance
const workflowManager = new WorkflowManager();

// Export both manager and stages (required by lily-ai-agent)
export { workflowManager };
export default workflowManager;

// Make available globally
if (typeof window !== 'undefined') {
    window.workflowManager = workflowManager;
    window.workflowStages = workflowStages;
    window.WorkflowManager = WorkflowManager;
}

console.log('Workflow Manager loaded successfully');
