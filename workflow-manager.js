// /workflow-manager.js
import { supabase } from './supabase-config.js';

export class WorkflowManager {
    constructor() {
        this.currentClinicId = null;
        this.currentPatientId = null;
        this.workflowStage = null;
        this.sessionData = {};
        this.loadFromSession();
    }
    
    // Workflow stages
    stages = {
        REGISTERED: 'registered',
        HEALTH_ASSESSMENT: 'health_assessment',
        IRIS_ASSESSMENT: 'iris_assessment',
        REPORT_GENERATION: 'report_generation',
        TREATMENT_PLANNING: 'treatment_planning',
        IN_TREATMENT: 'in_treatment',
        COMPLETED: 'completed',
        MAINTENANCE: 'maintenance'
    };
    
    // Load data from session
    loadFromSession() {
        const authData = localStorage.getItem('celloxen_auth');
        if (authData) {
            const auth = JSON.parse(authData);
            this.currentClinicId = auth.clinicId;
        }
        
        const patientId = sessionStorage.getItem('currentPatientId');
        if (patientId) {
            this.currentPatientId = parseInt(patientId);
        }
    }
    
    // Initialize new patient journey
    async startPatientJourney(patientId) {
        this.currentPatientId = parseInt(patientId);
        sessionStorage.setItem('currentPatientId', patientId);
        
        try {
            // Create or update workflow status
            const { data, error } = await supabase
                .from('patient_workflow_status')
                .upsert({
                    clinic_id: this.currentClinicId,
                    patient_id: parseInt(patientId),
                    current_stage: this.stages.HEALTH_ASSESSMENT,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'patient_id'
                })
                .select()
                .single();
                
            if (error) throw error;
            
            // Navigate to health assessment
            window.location.href = 'health-assessment/lily-ai-agent.html';
            
        } catch (error) {
            console.error('Error starting patient journey:', error);
            alert('Error starting patient journey. Please try again.');
        }
    }
    
    // Update workflow status
    async updateWorkflowStatus(stage, data = {}) {
        if (!this.currentPatientId) {
            console.error('No patient selected');
            return;
        }
        
        try {
            const { data: result, error } = await supabase
                .from('patient_workflow_status')
                .upsert({
                    clinic_id: this.currentClinicId,
                    patient_id: this.currentPatientId,
                    current_stage: stage,
                    stage_data: data,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'patient_id'
                })
                .select()
                .single();
                
            if (error) throw error;
            
            return result;
            
        } catch (error) {
            console.error('Error updating workflow:', error);
            throw error;
        }
    }
    
    // Get current workflow status
    async getCurrentStatus(patientId = null) {
        const pid = parseInt(patientId || this.currentPatientId);
        if (!pid) return null;
        
        try {
            const { data, error } = await supabase
                .from('patient_workflow_status')
                .select('*')
                .eq('patient_id', pid)
                .single();
                
            if (error && error.code !== 'PGRST116') {
                console.error('Error getting workflow status:', error);
            }
            
            return data;
            
        } catch (error) {
            console.error('Error in getCurrentStatus:', error);
            return null;
        }
    }
    
    // Navigate to next stage
    async navigateToNextStage() {
        const status = await this.getCurrentStatus();
        if (!status) {
            console.error('No workflow status found');
            window.location.href = 'clinic-dashboard.html';
            return;
        }
        
        switch(status.current_stage) {
            case this.stages.REGISTERED:
            case this.stages.HEALTH_ASSESSMENT:
                window.location.href = 'health-assessment/lily-ai-agent.html';
                break;
            case this.stages.IRIS_ASSESSMENT:
                window.location.href = 'iris-assessment.html';
                break;
            case this.stages.REPORT_GENERATION:
                window.location.href = 'comprehensive-report.html';
                break;
            case this.stages.TREATMENT_PLANNING:
                window.location.href = 'treatment-planning.html';
                break;
            case this.stages.IN_TREATMENT:
                window.location.href = 'treatment-delivery.html';
                break;
            default:
                window.location.href = 'clinic-dashboard.html';
        }
    }
    
    // Get incomplete assessments for clinic
    async getIncompleteAssessments() {
        if (!this.currentClinicId) {
            console.error('No clinic ID found');
            return [];
        }
        
        try {
            const { data, error } = await supabase
                .from('patient_workflow_status')
                .select(`
                    *,
                    patients!inner(
                        first_name,
                        last_name,
                        patient_id
                    )
                `)
                .eq('clinic_id', this.currentClinicId)
                .not('current_stage', 'in', '("completed","in_treatment")')
                .order('updated_at', { ascending: false });
                
            if (error) throw error;
            
            return data || [];
            
        } catch (error) {
            console.error('Error getting incomplete assessments:', error);
            return [];
        }
    }
    
    // Continue assessment for patient
    async continueAssessment(patientId) {
        this.currentPatientId = parseInt(patientId);
        sessionStorage.setItem('currentPatientId', patientId);
        await this.navigateToNextStage();
    }
    
    // Get workflow statistics
    async getWorkflowStats() {
        if (!this.currentClinicId) return {};
        
        try {
            const { data, error } = await supabase
                .from('patient_workflow_status')
                .select('current_stage')
                .eq('clinic_id', this.currentClinicId);
                
            if (error) throw error;
            
            const stats = {
                registered: 0,
                health_assessment: 0,
                iris_assessment: 0,
                report_generation: 0,
                treatment_planning: 0,
                in_treatment: 0,
                completed: 0
            };
            
            data?.forEach(item => {
                if (stats.hasOwnProperty(item.current_stage)) {
                    stats[item.current_stage]++;
                }
            });
            
            return stats;
            
        } catch (error) {
            console.error('Error getting workflow stats:', error);
            return {};
        }
    }
}

// Export singleton instance
export const workflowManager = new WorkflowManager();
