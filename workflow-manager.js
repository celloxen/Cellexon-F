// Simplified Workflow Manager - Focus on what works
import { supabase } from './supabase-config.js';

// Export stages for lily-ai-agent
export const workflowStages = {
    REGISTERED: 'registered',
    HEALTH_ASSESSMENT: 'health_assessment',
    IRIS_ASSESSMENT: 'iris_assessment',
    REPORT_GENERATION: 'report_generation',
    TREATMENT_PLANNING: 'treatment_planning',
    IN_TREATMENT: 'in_treatment'
};

class WorkflowManager {
    constructor() {
        this.validStages = Object.values(workflowStages);
    }
    
    // Simple method to continue after registration
    async continueAssessment(patientId) {
        sessionStorage.setItem('currentPatientId', patientId);
        // Just go to Lily - that's all we need for now
        window.location.href = `lily-ai-agent-integrated.html?patientId=${patientId}`;
    }
    
    // Update stage - but don't let it break the flow
    async updateStage(patientId, stage) {
        try {
            sessionStorage.setItem('workflow_stage', stage);
            console.log(`Stage updated: ${stage}`);
            return true;
        } catch (error) {
            console.log('Stage update error:', error);
            return true; // Always return true to keep flow going
        }
    }
    
    // For Lily compatibility
    async completeHealthAssessment(patientId, data) {
        sessionStorage.setItem('lastHealthAssessment', JSON.stringify(data));
        return data;
    }
    
    async getWorkflowStatus(patientId) {
        return {
            current_stage: sessionStorage.getItem('workflow_stage') || 'registered'
        };
    }
}

// Create and export instance
const workflowManager = new WorkflowManager();
export { workflowManager };
export default workflowManager;

// Make globally available
window.workflowManager = workflowManager;
window.workflowStages = workflowStages;

console.log('Workflow Manager loaded - simplified version');
