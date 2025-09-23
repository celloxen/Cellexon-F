// Workflow Manager - Fixed for valid stage names
class WorkflowManager {
    constructor(supabase) {
        this.supabase = supabase;
        
        // Valid workflow stages that match the database constraint
        this.validStages = [
            'registered',
            'health_questionnaire',  // Changed from 'health_assessment'
            'iris_assessment',
            'assessment_complete',
            'treatment_planning',
            'in_treatment',
            'completed'
        ];
    }
    
    async updateStage(patientId, newStage) {
        try {
            // Valid workflow stages from database constraint
            const validStages = [
                'registered',
                'health_assessment',
                'iris_assessment',
                'report_generation',
                'treatment_planning',
                'in_treatment',
                'completed',
                'maintenance'
            ];
            
            // Validate stage name
            if (!validStages.includes(newStage)) {
                console.warn(`Invalid stage: ${newStage}. Defaulting to 'registered'.`);
                newStage = 'registered';
            }
            
            const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
            const clinicId = authData.clinicId || sessionStorage.getItem('currentClinicId');
            
            // First try to get existing record
            const { data: existing, error: checkError } = await this.supabase
                .from('patient_workflow_status')
                .select('*')
                .eq('patient_id', patientId)
                .single();
            
            if (checkError && checkError.code === 'PGRST116') {
                // No record exists - INSERT new one
                const { data, error } = await this.supabase
                    .from('patient_workflow_status')
                    .insert([{
                        clinic_id: parseInt(clinicId),
                        patient_id: parseInt(patientId),
                        current_stage: newStage,
                        updated_at: new Date().toISOString()
                    }])
                    .select();
                
                if (error) {
                    console.error('Error inserting workflow status:', error);
                    throw error;
                }
                console.log(`Workflow created for patient ${patientId}: ${newStage}`, data);
            } else if (existing) {
                // Record exists - UPDATE it
                const { data, error } = await this.supabase
                    .from('patient_workflow_status')
                    .update({
                        current_stage: newStage,
                        updated_at: new Date().toISOString()
                    })
                    .eq('patient_id', patientId)
                    .select();
                
                if (error) {
                    console.error('Error updating workflow status:', error);
                    throw error;
                }
                console.log(`Workflow updated for patient ${patientId}: ${newStage}`, data);
            }
            
            return true;
        } catch (error) {
            console.error('Error in updateStage:', error);
            // Don't fail the whole process if workflow update fails
            return false;
        }
    }
    
    async completeHealthAssessment(patientId, assessmentData) {
        try {
            const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
            const clinicId = authData.clinicId || sessionStorage.getItem('currentClinicId');
            
            // Store assessment data
            const { data, error } = await this.supabase
                .from('health_assessments')
                .insert([{
                    patient_id: parseInt(patientId),
                    clinic_id: parseInt(clinicId),
                    assessment_data: assessmentData,
                    created_at: new Date().toISOString()
                }]);
            
            if (error && error.code !== '42P01') { // Ignore if table doesn't exist
                console.warn('Health assessments table issue:', error);
            }
            
            // Update workflow stage to health_assessment (valid stage from constraint)
            await this.updateStage(patientId, 'health_assessment');
            
            // Check if IRIS assessment is also complete
            const { data: iris } = await this.supabase
                .from('iris_assessments')
                .select('id')
                .eq('patient_id', patientId)
                .limit(1)
                .single();
            
            if (iris) {
                // Both assessments complete - move to report generation
                await this.updateStage(patientId, 'report_generation');
            }
            
            return assessmentData;
        } catch (error) {
            console.error('Error completing health assessment:', error);
            return assessmentData; // Return data even if database save fails
        }
    }
    
    async completeIrisAssessment(patientId, irisData) {
        try {
            const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
            const clinicId = authData.clinicId || sessionStorage.getItem('currentClinicId');
            
            // Store IRIS assessment data
            const { data, error } = await this.supabase
                .from('iris_assessments')
                .insert([{
                    patient_id: parseInt(patientId),
                    clinic_id: parseInt(clinicId),
                    ...irisData,
                    created_at: new Date().toISOString()
                }]);
            
            if (error) {
                console.warn('IRIS assessments table issue:', error);
            }
            
            // Update workflow stage
            await this.updateStage(patientId, 'iris_assessment');
            
            // Check if health assessment is also complete
            const { data: health } = await this.supabase
                .from('health_assessments')
                .select('id')
                .eq('patient_id', patientId)
                .limit(1)
                .single();
            
            if (health) {
                // Both assessments complete - move to report generation
                await this.updateStage(patientId, 'report_generation');
            }
            
            return irisData;
        } catch (error) {
            console.error('Error completing IRIS assessment:', error);
            return irisData; // Return data even if database save fails
        }
    }
    
    async getWorkflowStatus(patientId) {
        try {
            const { data, error } = await this.supabase
                .from('patient_workflow_status')
                .select('*')
                .eq('patient_id', patientId)
                .single();
            
            if (error) {
                return { current_stage: 'registered' };
            }
            
            return data;
        } catch (error) {
            console.error('Error getting workflow status:', error);
            return { current_stage: 'registered' };
        }
    }
    
    async generateReport(patientId) {
        try {
            // Get patient data
            const { data: patient } = await this.supabase
                .from('patients')
                .select('*')
                .eq('id', patientId)
                .single();
            
            // Get assessments
            const { data: healthAssessment } = await this.supabase
                .from('health_assessments')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            const { data: irisAssessment } = await this.supabase
                .from('iris_assessments')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            // Generate comprehensive report
            const report = {
                patient: patient,
                health_assessment: healthAssessment,
                iris_assessment: irisAssessment,
                generated_at: new Date().toISOString()
            };
            
            // Update workflow to treatment planning
            await this.updateStage(patientId, 'treatment_planning');
            
            // Redirect to report view or post-assessment workflow
            sessionStorage.setItem('lastAssessedPatientId', patientId);
            sessionStorage.setItem('lastAssessmentId', Date.now().toString());
            window.location.href = `post-assessment-workflow.html?patientId=${patientId}`;
            
            return report;
        } catch (error) {
            console.error('Error generating report:', error);
            return null;
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.WorkflowManager = WorkflowManager;
}

export default WorkflowManager;
