// Workflow Manager for Celloxen Platform
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Get supabase configuration
const supabaseUrl = 'https://defifwzgazqlrigwumqn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmlmd3pnYXpxbHJpZ3d1bXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTM0MjYsImV4cCI6MjA3MjgyOTQyNn0.wcUBq6Pszjtqn5aBtuu3iXBE4BLmu8x9LtJbsMWlIiA';

// Create supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Define workflow stages
export const workflowStages = {
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
    constructor() {
        this.supabase = supabase;
        this.validStages = Object.values(workflowStages);
    }
    
    async initializeWorkflow(patientId) {
        try {
            const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
            const clinicId = parseInt(authData.clinicId || sessionStorage.getItem('currentClinicId') || 1);
            
            const { error } = await this.supabase
                .from('patient_workflow_status')
                .insert({
                    clinic_id: clinicId,
                    patient_id: parseInt(patientId),
                    current_stage: workflowStages.REGISTERED,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            
            if (error && error.code !== '23505') {
                console.error('Error initializing workflow:', error);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to initialize workflow:', error);
            return false;
        }
    }
    
    async continueAssessment(patientId) {
        try {
            const status = await this.getWorkflowStatus(patientId);
            const stage = status.current_stage || workflowStages.REGISTERED;
            
            sessionStorage.setItem('currentPatientId', patientId);
            
            // Route based on current stage
            switch(stage) {
                case workflowStages.REGISTERED:
                case workflowStages.HEALTH_ASSESSMENT:
                    window.location.href = `lily-ai-agent-integrated.html?patientId=${patientId}`;
                    break;
                case workflowStages.IRIS_ASSESSMENT:
                    window.location.href = `iris-assessment-integrated.html?patientId=${patientId}`;
                    break;
                case workflowStages.REPORT_GENERATION:
                    window.location.href = `report-generator.html?patientId=${patientId}`;
                    break;
                case workflowStages.TREATMENT_PLANNING:
                    window.location.href = `treatment-planning.html?patientId=${patientId}`;
                    break;
                case workflowStages.IN_TREATMENT:
                    window.location.href = `treatment-progress.html?patientId=${patientId}`;
                    break;
                default:
                    alert('This patient has completed their journey or is in maintenance.');
            }
        } catch (error) {
            console.error('Error continuing assessment:', error);
            alert('Error loading patient workflow status');
        }
    }
    
    async updateStage(patientId, newStage) {
        try {
            if (!this.validStages.includes(newStage)) {
                console.warn(`Invalid stage: ${newStage}`);
                return false;
            }
            
            const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
            const clinicId = parseInt(authData.clinicId || sessionStorage.getItem('currentClinicId') || 1);
            
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
                    .insert({
                        clinic_id: clinicId,
                        patient_id: parseInt(patientId),
                        current_stage: newStage,
                        updated_at: new Date().toISOString()
                    });
                
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
    
    async getWorkflowStats() {
        try {
            const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
            const clinicId = authData.clinicId || sessionStorage.getItem('currentClinicId');
            
            if (!clinicId) return {};
            
            const { data } = await this.supabase
                .from('patient_workflow_status')
                .select('current_stage')
                .eq('clinic_id', clinicId);
            
            const stats = {};
            this.validStages.forEach(stage => {
                stats[stage] = 0;
            });
            
            if (data) {
                data.forEach(record => {
                    if (record.current_stage && stats[record.current_stage] !== undefined) {
                        stats[record.current_stage]++;
                    }
                });
            }
            
            return stats;
        } catch (error) {
            console.error('Error getting workflow stats:', error);
            return {};
        }
    }
    
    async getIncompleteAssessments() {
        try {
            const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
            const clinicId = authData.clinicId || sessionStorage.getItem('currentClinicId');
            
            if (!clinicId) return [];
            
            const { data } = await this.supabase
                .from('patient_workflow_status')
                .select(`
                    *,
                    patients!inner(
                        id,
                        first_name,
                        last_name,
                        patient_id
                    )
                `)
                .eq('clinic_id', clinicId)
                .in('current_stage', [
                    workflowStages.REGISTERED,
                    workflowStages.HEALTH_ASSESSMENT,
                    workflowStages.IRIS_ASSESSMENT
                ])
                .order('updated_at', { ascending: false });
            
            return data || [];
        } catch (error) {
            console.error('Error getting incomplete assessments:', error);
            return [];
        }
    }
    
    async completeHealthAssessment(patientId, assessmentData) {
        try {
            await this.updateStage(patientId, workflowStages.IRIS_ASSESSMENT);
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
            await this.updateStage(patientId, workflowStages.REPORT_GENERATION);
            return irisData;
        } catch (error) {
            console.error('Error completing IRIS assessment:', error);
            return irisData;
        }
    }
}

// Create and export instance
export const workflowManager = new WorkflowManager();

// Export class for testing
export { WorkflowManager };

// Make available on window for non-module scripts
window.workflowManager = workflowManager;
window.workflowStages = workflowStages;
window.WorkflowManager = WorkflowManager;
