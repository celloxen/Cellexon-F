// Workflow Manager Module - Fixed Version
// Manages patient workflow progression through the system

import { supabase } from './supabase-config.js';

class WorkflowManager {
    constructor() {
        this.currentPatient = null;
        this.currentStage = null;
        this.workflowStages = [
            'registration',
            'health_assessment', 
            'iris_assessment',
            'report_generation',
            'treatment_planning',
            'treatment_scheduling',
            'in_treatment'
        ];
    }

    // Initialize workflow for a patient
    async initializeWorkflow(patientId) {
        try {
            // Check if workflow exists
            const { data: existing, error: checkError } = await supabase
                .from('patient_workflow_status')
                .select('*')
                .eq('patient_id', patientId)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
            }

            if (!existing) {
                // Create new workflow
                const { data, error } = await supabase
                    .from('patient_workflow_status')
                    .insert([{
                        patient_id: patientId,
                        current_stage: 'registration',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }

            return existing;
        } catch (error) {
            console.error('Error initializing workflow:', error);
            // Return default workflow status
            return {
                patient_id: patientId,
                current_stage: 'registration',
                created_at: new Date().toISOString()
            };
        }
    }

    // Update workflow stage
    async updateStage(patientId, stage, additionalData = {}) {
        try {
            const updateData = {
                current_stage: stage,
                updated_at: new Date().toISOString(),
                ...additionalData
            };

            // Mark stage as completed
            const stageField = `${stage}_completed`;
            if (this.workflowStages.includes(stage)) {
                updateData[stageField] = true;
            }

            const { data, error } = await supabase
                .from('patient_workflow_status')
                .update(updateData)
                .eq('patient_id', patientId)
                .select()
                .single();

            if (error) throw error;
            return data;

        } catch (error) {
            console.error('Error updating workflow stage:', error);
            return null;
        }
    }

    // Get current workflow status
    async getWorkflowStatus(patientId) {
        try {
            const { data, error } = await supabase
                .from('patient_workflow_status')
                .select('*')
                .eq('patient_id', patientId)
                .single();

            if (error) throw error;
            return data;

        } catch (error) {
            console.error('Error getting workflow status:', error);
            return null;
        }
    }

    // Get next stage in workflow
    getNextStage(currentStage) {
        const currentIndex = this.workflowStages.indexOf(currentStage);
        if (currentIndex === -1 || currentIndex === this.workflowStages.length - 1) {
            return null;
        }
        return this.workflowStages[currentIndex + 1];
    }

    // Check if stage is completed
    async isStageCompleted(patientId, stage) {
        try {
            const status = await this.getWorkflowStatus(patientId);
            if (!status) return false;

            const stageField = `${stage}_completed`;
            return status[stageField] === true;

        } catch (error) {
            console.error('Error checking stage completion:', error);
            return false;
        }
    }

    // Get workflow statistics for dashboard
    async getWorkflowStats(clinicId) {
        try {
            // Get all patients for the clinic
            const { data: patients, error: patientsError } = await supabase
                .from('patients')
                .select('id')
                .eq('clinic_id', clinicId);

            if (patientsError) throw patientsError;

            const patientIds = patients.map(p => p.id);

            if (patientIds.length === 0) {
                return {
                    total: 0,
                    byStage: {}
                };
            }

            // Get workflow status for all patients
            const { data: workflows, error: workflowError } = await supabase
                .from('patient_workflow_status')
                .select('current_stage')
                .in('patient_id', patientIds);

            if (workflowError) throw workflowError;

            // Count by stage
            const stats = {
                total: workflows.length,
                byStage: {}
            };

            this.workflowStages.forEach(stage => {
                stats.byStage[stage] = workflows.filter(w => w.current_stage === stage).length;
            });

            return stats;

        } catch (error) {
            console.error('Error getting workflow stats:', error);
            return {
                total: 0,
                byStage: {}
            };
        }
    }

    // Navigate to appropriate page based on workflow stage
    navigateToStage(patientId, stage) {
        const routes = {
            'registration': `patient-registration.html?id=${patientId}`,
            'health_assessment': `health-assessment.html?patientId=${patientId}`,
            'iris_assessment': `iris-assessment.html?patientId=${patientId}`,
            'report_generation': `report-generator.html?patientId=${patientId}`,
            'treatment_planning': `treatment-planning.html?patientId=${patientId}`,
            'treatment_scheduling': `treatment-schedule.html?patient=${patientId}`,
            'in_treatment': `patient-management.html?patientId=${patientId}`
        };

        const route = routes[stage];
        if (route) {
            window.location.href = route;
        }
    }

    // Store current workflow in session
    storeInSession(patientId, stage) {
        sessionStorage.setItem('currentPatientId', patientId);
        sessionStorage.setItem('currentWorkflowStage', stage);
    }

    // Retrieve from session
    getFromSession() {
        return {
            patientId: sessionStorage.getItem('currentPatientId'),
            stage: sessionStorage.getItem('currentWorkflowStage')
        };
    }

    // Clear workflow session
    clearSession() {
        sessionStorage.removeItem('currentPatientId');
        sessionStorage.removeItem('currentWorkflowStage');
        sessionStorage.removeItem('healthAssessmentCompleted');
        sessionStorage.removeItem('irisAssessmentCompleted');
        sessionStorage.removeItem('reportGenerated');
        sessionStorage.removeItem('treatmentPlanId');
    }
}

// Create singleton instance
const workflowManager = new WorkflowManager();

// Export as NAMED export (this is what patient-registration.html expects)
export { workflowManager };

// Also export as default for backwards compatibility
export default workflowManager;

// Also export the getter function
export function getWorkflowManager() {
    return workflowManager;
}

// Make available globally for non-module scripts
if (typeof window !== 'undefined') {
    window.workflowManager = workflowManager;
}

console.log('Workflow Manager loaded successfully');
