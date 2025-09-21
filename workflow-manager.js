// Enhanced Workflow Manager for Celloxen Platform
// Handles patient journey through assessment, treatment, and follow-up cycles

import { supabase } from './supabase-config.js';

const workflowStages = {
    REGISTERED: 'registered',
    HEALTH_ASSESSMENT_PENDING: 'health_assessment_pending',
    HEALTH_ASSESSMENT_COMPLETED: 'health_assessment_completed',
    IRIS_ASSESSMENT_PENDING: 'iris_assessment_pending',
    IRIS_ASSESSMENT_COMPLETED: 'iris_assessment_completed',
    REPORT_PENDING: 'report_pending',
    REPORT_GENERATED: 'report_generated',
    TREATMENT_PLANNING: 'treatment_planning',
    IN_TREATMENT: 'in_treatment',
    POST_TREATMENT_ASSESSMENT: 'post_treatment_assessment'
};

const workflowManager = {
    // Get current workflow status for a patient
    async getPatientWorkflow(patientId) {
        try {
            const { data, error } = await supabase
                .from('patient_workflow_status')
                .select('*')
                .eq('patient_id', patientId)
                .single();
            
            if (error && error.code === 'PGRST116') {
                // No workflow record exists, create one
                return await this.initializeWorkflow(patientId);
            }
            
            return data;
        } catch (error) {
            console.error('Error getting workflow:', error);
            return null;
        }
    },

    // Initialize workflow for new patient
    async initializeWorkflow(patientId) {
        const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
        const clinicId = authData.clinicId || sessionStorage.getItem('currentClinicId');
        
        const workflowData = {
            patient_id: patientId,
            clinic_id: clinicId,
            current_stage: workflowStages.REGISTERED,
            assessment_count: 0,
            assessment_type: 'initial',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        try {
            const { data, error } = await supabase
                .from('patient_workflow_status')
                .insert(workflowData)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error initializing workflow:', error);
            return null;
        }
    },

    // Update workflow stage
    async updateStage(patientId, newStage, metadata = {}) {
        try {
            const updateData = {
                current_stage: newStage,
                updated_at: new Date().toISOString(),
                ...metadata
            };
            
            const { error } = await supabase
                .from('patient_workflow_status')
                .update(updateData)
                .eq('patient_id', patientId);
            
            if (error) throw error;
            
            // Log stage transition
            await this.logStageTransition(patientId, newStage, metadata);
            
            return true;
        } catch (error) {
            console.error('Error updating workflow stage:', error);
            return false;
        }
    },

    // Log stage transitions for audit
    async logStageTransition(patientId, newStage, metadata) {
        const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
        
        try {
            await supabase
                .from('workflow_transitions')
                .insert({
                    patient_id: patientId,
                    new_stage: newStage,
                    transitioned_by: authData.userId,
                    transition_type: metadata.skipped ? 'skipped' : 'normal',
                    skip_reason: metadata.skip_reason || null,
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('Error logging transition:', error);
        }
    },

    // Determine next action based on current stage
    async continueAssessment(patientId) {
        const workflow = await this.getPatientWorkflow(patientId);
        if (!workflow) {
            alert('Error loading patient workflow');
            return;
        }
        
        // Store patient ID for the assessment modules
        sessionStorage.setItem('currentPatientId', patientId);
        
        switch (workflow.current_stage) {
            case workflowStages.REGISTERED:
            case workflowStages.HEALTH_ASSESSMENT_PENDING:
                await this.startHealthAssessment(patientId);
                break;
                
            case workflowStages.HEALTH_ASSESSMENT_COMPLETED:
            case workflowStages.IRIS_ASSESSMENT_PENDING:
                await this.startIrisAssessment(patientId);
                break;
                
            case workflowStages.IRIS_ASSESSMENT_COMPLETED:
            case workflowStages.REPORT_PENDING:
                await this.generateReport(patientId);
                break;
                
            case workflowStages.REPORT_GENERATED:
                await this.viewReport(patientId);
                break;
                
            case workflowStages.TREATMENT_PLANNING:
                await this.startTreatmentPlanning(patientId);
                break;
                
            case workflowStages.IN_TREATMENT:
                await this.viewTreatmentProgress(patientId);
                break;
                
            case workflowStages.POST_TREATMENT_ASSESSMENT:
                await this.startPostTreatmentAssessment(patientId);
                break;
                
            default:
                alert('Unknown workflow stage. Please contact support.');
        }
    },

    // Start health assessment
    async startHealthAssessment(patientId) {
        await this.updateStage(patientId, workflowStages.HEALTH_ASSESSMENT_PENDING);
        window.location.href = 'health-assessment.html';
    },

    // Complete health assessment
    async completeHealthAssessment(patientId, assessmentData) {
        try {
            // Save assessment data
            const { data: assessment, error } = await supabase
                .from('health_assessments')
                .insert({
                    patient_id: patientId,
                    clinic_id: assessmentData.clinic_id,
                    assessment_data: assessmentData,
                    assessment_type: assessmentData.assessment_type || 'initial',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            
            // Update workflow stage
            await this.updateStage(patientId, workflowStages.HEALTH_ASSESSMENT_COMPLETED, {
                assessment_count: assessmentData.assessment_count || 1,
                last_assessment_id: assessment.id
            });
            
            return assessment;
        } catch (error) {
            console.error('Error completing health assessment:', error);
            return null;
        }
    },

    // Start iris assessment
    async startIrisAssessment(patientId) {
        await this.updateStage(patientId, workflowStages.IRIS_ASSESSMENT_PENDING);
        window.location.href = 'iris-assessment.html';
    },

    // Complete iris assessment
    async completeIrisAssessment(patientId, assessmentData) {
        try {
            // Save iris assessment data
            const { data: assessment, error } = await supabase
                .from('iris_assessments')
                .insert({
                    patient_id: patientId,
                    clinic_id: assessmentData.clinic_id,
                    iris_data: assessmentData,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            
            // Update workflow stage
            await this.updateStage(patientId, workflowStages.IRIS_ASSESSMENT_COMPLETED, {
                last_iris_assessment_id: assessment.id
            });
            
            return assessment;
        } catch (error) {
            console.error('Error completing iris assessment:', error);
            return null;
        }
    },

    // Generate comprehensive report
    async generateReport(patientId) {
        await this.updateStage(patientId, workflowStages.REPORT_PENDING);
        window.location.href = `report-generator.html?patient=${patientId}`;
    },

    // View generated report
    async viewReport(patientId) {
        window.location.href = `view-report.html?patient=${patientId}`;
    },

    // Start treatment planning
    async startTreatmentPlanning(patientId) {
        await this.updateStage(patientId, workflowStages.TREATMENT_PLANNING);
        window.location.href = `treatment-planning.html?patient=${patientId}`;
    },

    // View treatment progress
    async viewTreatmentProgress(patientId) {
        window.location.href = `treatment-progress.html?patient=${patientId}`;
    },

    // Start post-treatment assessment
    async startPostTreatmentAssessment(patientId) {
        // Mark as follow-up assessment
        await this.updateStage(patientId, workflowStages.HEALTH_ASSESSMENT_PENDING, {
            assessment_type: 'follow-up'
        });
        window.location.href = 'health-assessment.html';
    },

    // Skip to specific stage (practitioner override)
    async skipToStage(patientId, targetStage, reason) {
        const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
        
        if (!confirm(`Are you sure you want to skip to ${targetStage}? This will be logged.`)) {
            return false;
        }
        
        return await this.updateStage(patientId, targetStage, {
            skipped: true,
            skipped_by: authData.userId,
            skip_reason: reason
        });
    },

    // Get workflow statistics for dashboard
    async getWorkflowStats() {
        const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
        const clinicId = authData.clinicId || sessionStorage.getItem('currentClinicId');
        
        if (!clinicId) return {};
        
        try {
            const { data, error } = await supabase
                .from('patient_workflow_status')
                .select('current_stage')
                .eq('clinic_id', clinicId);
            
            if (error) throw error;
            
            // Count patients at each stage
            const stats = {};
            Object.values(workflowStages).forEach(stage => {
                stats[stage] = 0;
            });
            
            data?.forEach(record => {
                if (stats.hasOwnProperty(record.current_stage)) {
                    stats[record.current_stage]++;
                }
            });
            
            return stats;
        } catch (error) {
            console.error('Error getting workflow stats:', error);
            return {};
        }
    },

    // Get patients with incomplete assessments
    async getIncompleteAssessments() {
        const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
        const clinicId = authData.clinicId || sessionStorage.getItem('currentClinicId');
        
        if (!clinicId) return [];
        
        try {
            const { data, error } = await supabase
                .from('patient_workflow_status')
                .select(`
                    *,
                    patients(first_name, last_name, patient_id)
                `)
                .eq('clinic_id', clinicId)
                .in('current_stage', [
                    workflowStages.HEALTH_ASSESSMENT_PENDING,
                    workflowStages.IRIS_ASSESSMENT_PENDING,
                    workflowStages.REPORT_PENDING
                ])
                .order('updated_at', { ascending: true });
            
            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('Error getting incomplete assessments:', error);
            return [];
        }
    },

    // Check if reassessment is needed
    async checkReassessmentNeeded(patientId) {
        try {
            // Get last assessment date
            const { data, error } = await supabase
                .from('health_assessments')
                .select('created_at')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (error) return false;
            
            // Check if more than 30 days since last assessment
            const lastAssessment = new Date(data.created_at);
            const daysSince = (new Date() - lastAssessment) / (1000 * 60 * 60 * 24);
            
            return daysSince > 30;
        } catch (error) {
            console.error('Error checking reassessment:', error);
            return false;
        }
    }
};

// Export for use in other modules
export { workflowManager, workflowStages };
