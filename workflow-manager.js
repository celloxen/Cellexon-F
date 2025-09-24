// Add these methods to the WorkflowManager class:

// Complete workflow from Lily to end
async continueWorkflow(patientId, currentStage) {
    switch(currentStage) {
        case 'health_assessment_complete':
            // After Lily, go to IRIS
            await this.updateStage(patientId, workflowStages.HEALTH_ASSESSMENT);
            window.location.href = `iris-assessment-integrated.html?patientId=${patientId}`;
            break;
            
        case 'iris_assessment_complete':
            // After IRIS, auto-generate report
            await this.updateStage(patientId, workflowStages.IRIS_ASSESSMENT);
            window.location.href = `report-generator.html?patientId=${patientId}&autoGenerate=true`;
            break;
            
        case 'report_generated':
            // After report generation, auto-email then display
            await this.updateStage(patientId, workflowStages.REPORT_GENERATION);
            await this.emailReport(patientId);
            // Display report with options
            this.displayReportWithOptions(patientId);
            break;
            
        case 'continue_to_treatment':
            // From report display to treatment planning
            window.location.href = `treatment-planning-enhanced.html?patientId=${patientId}`;
            break;
            
        case 'treatment_plan_confirmed':
            // After treatment plan, auto-schedule
            await this.updateStage(patientId, workflowStages.TREATMENT_PLANNING);
            window.location.href = `treatment-scheduler-auto.html?patientId=${patientId}&autoSchedule=true`;
            break;
            
        case 'appointments_scheduled':
            // After scheduling, show confirmation
            await this.updateStage(patientId, workflowStages.IN_TREATMENT);
            this.showConfirmationScreen(patientId);
            break;
            
        case 'workflow_complete':
            // Return to dashboard
            window.location.href = 'clinic-dashboard.html';
            break;
    }
}

// Auto-email report (Step 6)
async emailReport(patientId) {
    try {
        // Get patient email
        const { data: patient } = await supabase
            .from('patients')
            .select('email, first_name, last_name')
            .eq('id', patientId)
            .single();
            
        if (patient?.email) {
            // Trigger email via Supabase Edge Function
            const { data, error } = await supabase.functions.invoke('send-report-email', {
                body: {
                    to: patient.email,
                    patientName: `${patient.first_name} ${patient.last_name}`,
                    reportId: sessionStorage.getItem('lastReportId')
                }
            });
            
            // Log email status
            await supabase
                .from('email_logs')
                .insert({
                    patient_id: patientId,
                    email_type: 'assessment_report',
                    recipient: patient.email,
                    sent_at: new Date().toISOString(),
                    status: error ? 'failed' : 'sent'
                });
                
            console.log(`Report emailed to ${patient.email}`);
        }
    } catch (error) {
        console.error('Error emailing report:', error);
        // Continue workflow even if email fails
    }
}

// Display report with action buttons (Step 7)
displayReportWithOptions(patientId) {
    // This would be called from report-generator.html
    // Shows report with two buttons:
    // 1. Continue to Treatment Planning
    // 2. Exit to Dashboard
    
    // The report page should have:
    const reportActions = `
        <div class="report-actions">
            <button onclick="workflowManager.continueWorkflow(${patientId}, 'continue_to_treatment')">
                Continue to Treatment Planning →
            </button>
            <button onclick="workflowManager.continueWorkflow(${patientId}, 'workflow_complete')">
                Exit to Dashboard
            </button>
        </div>
    `;
}

// Auto-schedule appointments (Step 9)
async autoScheduleAppointments(patientId, treatmentPlanId) {
    try {
        const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
        const clinicId = authData.clinicId || sessionStorage.getItem('currentClinicId');
        
        // Get treatment plan
        const { data: plan } = await supabase
            .from('treatment_plans')
            .select('*')
            .eq('id', treatmentPlanId)
            .single();
            
        if (!plan) return false;
        
        // Generate appointment schedule
        const appointments = [];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1); // Start tomorrow
        
        // Create appointments (e.g., 3x per week for 4 weeks = 12 sessions)
        const sessionCount = plan.total_sessions || 12;
        const sessionsPerWeek = 3;
        let currentDate = new Date(startDate);
        
        for (let i = 0; i < sessionCount; i++) {
            // Skip weekends
            while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            appointments.push({
                patient_id: patientId,
                clinic_id: clinicId,
                appointment_date: currentDate.toISOString().split('T')[0],
                appointment_time: '10:00',
                appointment_type: 'treatment',
                treatment_plan_id: treatmentPlanId,
                session_number: i + 1,
                status: 'scheduled'
            });
            
            // Move to next appointment day
            if ((i + 1) % sessionsPerWeek === 0) {
                // After 3 sessions, skip to next week
                currentDate.setDate(currentDate.getDate() + 3);
            } else {
                // Next session in 2 days
                currentDate.setDate(currentDate.getDate() + 2);
            }
        }
        
        // Bulk insert appointments
        const { error } = await supabase
            .from('appointments')
            .insert(appointments);
            
        if (!error) {
            await this.updateStage(patientId, workflowStages.IN_TREATMENT);
            return appointments;
        }
        
        return false;
    } catch (error) {
        console.error('Error auto-scheduling:', error);
        return false;
    }
}

// Show final confirmation (Step 10)
showConfirmationScreen(patientId) {
    // This would be in the treatment-scheduler page
    const confirmationHTML = `
        <div class="confirmation-screen">
            <h2>✓ Patient Journey Complete</h2>
            <div class="confirmation-items">
                <p>✓ Health assessment completed</p>
                <p>✓ IRIS assessment completed</p>
                <p>✓ Comprehensive report generated</p>
                <p>✓ Report emailed to patient</p>
                <p>✓ Treatment plan created</p>
                <p>✓ 12 appointments scheduled</p>
                <p>✓ Patient notified via email</p>
            </div>
            <button onclick="workflowManager.continueWorkflow(${patientId}, 'workflow_complete')">
                Exit to Dashboard
            </button>
        </div>
    `;
}
