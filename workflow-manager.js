// Workflow Manager for Celloxen Platform
// Manages patient progress through assessment and treatment stages

// Define workflow stages
const workflowStages = {
    REGISTERED: 'registered',
    HEALTH_ASSESSMENT: 'health_assessment',
    IRIS_ASSESSMENT: 'iris_assessment',
    REPORT_GENERATION: 'report_generation',
    TREATMENT_PLANNING: 'treatment_planning',
    IN_TREATMENT: 'in_treatment',
    COMPLETED: 'completed',
    MAINTENANCE: 'maintenance'
};

class WorkflowManager {
    constructor(supabaseClient) {
        this.supabase = supabaseClient || window.supabase;
        this.validStages = Object.values(workflowStages);
    }
    
    async updateStage(patientId, newStage) {
        try {
            if (!this.validStages.includes(newStage)) {
                console.warn(`Invalid stage: ${newStage}`);
                return false;
            }
            
            const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
            const clinicId = authData.clinicId || sessionStorage.getItem('currentClinicId') || 1;
            
            // Check if record exists
            const { data: existing } = await this.supabase
                .from('patient_workflow_status')
                .select('*')
                .eq('patient_id', patientId)
                .single();
            
            if (!existing) {
                // Insert new record
                const { error } = await this.supabase
                    .from('patient_workflow_status')
                    .insert([{
                        clinic_id: parseInt(clinicId),
                        patient_id: parseInt(patientId),
                        current_stage: newStage,
                        updated_at: new Date().toISOString()
                    }]);
                
                if (error) {
                    console.error('Insert error:', error);
                    return false;
                }
            } else {
                // Update existing record
                const { error } = await this.supabase
                    .from('patient_workflow_status')
                    .update({
                        current_stage: newStage,
                        updated_at: new Date().toISOString()
                    })
                    .eq('patient_id', patientId);
                
                if (error) {
                    console.error('Update error:', error);
                    return false;
                }
            }
            
            console.log(`Workflow updated: Patient ${patientId} -> ${newStage}`);
            return true;
        } catch (error) {
            console.error('Workflow update failed:', error);
            return false;
        }
    }
    
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
    
    async completeIrisAssessment(patientId, irisData) {
        try {
            await this.updateStage(patientId, workflowStages.IRIS_ASSESSMENT);
            
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
    
    async generateReport(patientId) {
        try {
            await this.updateStage(patientId, workflowStages.REPORT_GENERATION);
            
            // Redirect to post-assessment workflow
            sessionStorage.setItem('lastAssessedPatientId', patientId);
            sessionStorage.setItem('lastAssessmentId', Date.now().toString());
            
            setTimeout(() => {
                window.location.href = `post-assessment-workflow.html?patientId=${patientId}`;
            }, 1000);
            
            return true;
        } catch (error) {
            console.error('Error generating report:', error);
            return false;
        }
    }
    
    async getWorkflowStatus(patientId) {
        try {
            const { data } = await this.supabase
                .from('patient_workflow_status')
                .select('*')
                .eq('patient_id', patientId)
                .single();
            
            return data || { current_stage: workflowStages.REGISTERED };
        } catch (error) {
            return { current_stage: workflowStages.REGISTERED };
        }
    }
}

// Create instance with supabase from window if available
let workflowManager = null;

// Initialize when supabase is ready
if (window.supabase) {
    workflowManager = new WorkflowManager(window.supabase);
} else {
    // Wait for supabase to be available
    const checkSupabase = setInterval(() => {
        if (window.supabase) {
            workflowManager = new WorkflowManager(window.supabase);
            clearInterval(checkSupabase);
            console.log('Workflow Manager initialized');
        }
    }, 100);
}

// Export everything
export { WorkflowManager, workflowManager, workflowStages };
export default WorkflowManager;

// Also make available on window
window.WorkflowManager = WorkflowManager;
window.workflowStages = workflowStages;
window.workflowManager = workflowManager;
