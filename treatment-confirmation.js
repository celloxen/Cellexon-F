// Treatment Confirmation Module for Celloxen Platform
// Handles final confirmation, notifications, and workflow updates

import { supabase } from './supabase-config.js';
import { sendReportEmail } from './email-sender.js';

/**
 * Complete treatment plan confirmation process
 * @param {Object} planData - Treatment plan data
 * @param {Array} appointments - Created appointments
 * @returns {Object} Confirmation result
 */
export async function confirmTreatmentPlan(planData, appointments) {
    try {
        const confirmationSteps = {
            planSaved: false,
            appointmentsCreated: false,
            emailSent: false,
            workflowUpdated: false,
            errors: []
        };
        
        // Step 1: Verify plan is saved
        if (planData.id) {
            confirmationSteps.planSaved = true;
        } else {
            // Save plan if not already saved
            const saveResult = await saveTreatmentPlan(planData);
            if (saveResult.success) {
                confirmationSteps.planSaved = true;
                planData.id = saveResult.planId;
            } else {
                confirmationSteps.errors.push('Failed to save treatment plan');
            }
        }
        
        // Step 2: Verify appointments are created
        if (appointments && appointments.length > 0) {
            confirmationSteps.appointmentsCreated = true;
            confirmationSteps.appointmentCount = appointments.length;
        } else {
            confirmationSteps.errors.push('No appointments created');
        }
        
        // Step 3: Send notification email
        const emailResult = await sendNotificationEmail(planData, appointments);
        confirmationSteps.emailSent = emailResult.success;
        if (!emailResult.success) {
            confirmationSteps.errors.push('Email notification failed');
        }
        
        // Step 4: Update workflow status
        const workflowResult = await updateWorkflowStatus(planData.patient_id, 'in_treatment');
        confirmationSteps.workflowUpdated = workflowResult.success;
        if (!workflowResult.success) {
            confirmationSteps.errors.push('Workflow update failed');
        }
        
        // Step 5: Log the completion
        await logTreatmentPlanCompletion(planData, confirmationSteps);
        
        // Step 6: Clear session data
        clearSessionData();
        
        return {
            success: confirmationSteps.errors.length === 0,
            steps: confirmationSteps,
            summary: generateConfirmationSummary(planData, appointments, confirmationSteps)
        };
        
    } catch (error) {
        console.error('Error in treatment plan confirmation:', error);
        return {
            success: false,
            error: error.message,
            steps: { errors: [error.message] }
        };
    }
}

/**
 * Save treatment plan to database
 */
async function saveTreatmentPlan(planData) {
    try {
        const { data, error } = await supabase
            .from('treatment_plans')
            .insert([{
                ...planData,
                status: 'active',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        return {
            success: true,
            planId: data.id
        };
        
    } catch (error) {
        console.error('Error saving treatment plan:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send notification email to patient
 */
async function sendNotificationEmail(planData, appointments) {
    try {
        // Get patient details
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('*')
            .eq('id', planData.patient_id)
            .single();
        
        if (patientError || !patient) {
            return { success: false, error: 'Patient not found' };
        }
        
        if (!patient.email) {
            return { success: false, error: 'Patient email not available' };
        }
        
        // Generate email content with treatment schedule
        const emailContent = generateTreatmentScheduleEmail(patient, planData, appointments);
        
        // Create PDF attachment with schedule
        const scheduleHtml = generateScheduleHTML(patient, planData, appointments);
        const pdfBlob = await generatePDF(scheduleHtml);
        
        // Send email using email-sender module
        const emailSent = await sendReportEmail(
            pdfBlob,
            patient.email,
            `${patient.first_name} ${patient.last_name}`
        );
        
        // Log email in database
        if (emailSent) {
            await supabase
                .from('email_logs')
                .insert([{
                    patient_id: planData.patient_id,
                    clinic_id: planData.clinic_id,
                    email_type: 'treatment_schedule',
                    recipient: patient.email,
                    subject: 'Your Treatment Schedule - Celloxen Wellness',
                    sent_at: new Date().toISOString(),
                    status: 'sent'
                }]);
        }
        
        return {
            success: emailSent,
            email: patient.email
        };
        
    } catch (error) {
        console.error('Error sending notification email:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Update patient workflow status
 */
async function updateWorkflowStatus(patientId, newStatus) {
    try {
        // First check if record exists
        const { data: existing } = await supabase
            .from('patient_workflow_status')
            .select('*')
            .eq('patient_id', patientId)
            .single();
        
        if (existing) {
            // Update existing record
            const { error } = await supabase
                .from('patient_workflow_status')
                .update({
                    current_stage: newStatus,
                    treatment_planning_completed: true,
                    updated_at: new Date().toISOString()
                })
                .eq('patient_id', patientId);
            
            if (error) throw error;
        } else {
            // Create new record
            const { error } = await supabase
                .from('patient_workflow_status')
                .insert([{
                    patient_id: patientId,
                    current_stage: newStatus,
                    health_assessment_completed: true,
                    iris_assessment_completed: true,
                    report_generated: true,
                    treatment_planning_completed: true,
                    created_at: new Date().toISOString()
                }]);
            
            if (error) throw error;
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('Error updating workflow status:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Log treatment plan completion
 */
async function logTreatmentPlanCompletion(planData, confirmationSteps) {
    try {
        await supabase
            .from('activity_logs')
            .insert([{
                action: 'treatment_plan_completed',
                entity_type: 'treatment_plan',
                entity_id: planData.id,
                patient_id: planData.patient_id,
                clinic_id: planData.clinic_id,
                details: confirmationSteps,
                created_at: new Date().toISOString()
            }]);
            
    } catch (error) {
        // Logging is optional, don't fail the process
        console.log('Activity logging skipped:', error);
    }
}

/**
 * Clear session data
 */
function clearSessionData() {
    // Clear workflow-related session storage
    const keysToRemove = [
        'currentPatientId',
        'healthAssessmentCompleted',
        'irisAssessmentCompleted',
        'reportId',
        'treatmentPlanId',
        'selectedTherapies',
        'schedulingConfig',
        'treatmentPlan'
    ];
    
    keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
    });
    
    console.log('Session data cleared');
}

/**
 * Generate confirmation summary
 */
function generateConfirmationSummary(planData, appointments, confirmationSteps) {
    const summary = {
        planId: planData.id,
        patientId: planData.patient_id,
        totalSessions: appointments.length,
        duration: `${planData.duration_weeks} weeks`,
        startDate: appointments[0]?.appointment_date || 'Not scheduled',
        endDate: appointments[appointments.length - 1]?.appointment_date || 'Not scheduled',
        emailSent: confirmationSteps.emailSent,
        workflowStatus: confirmationSteps.workflowUpdated ? 'in_treatment' : 'pending',
        completedSteps: Object.keys(confirmationSteps).filter(key => 
            confirmationSteps[key] === true && key !== 'errors'
        ),
        errors: confirmationSteps.errors
    };
    
    return summary;
}

/**
 * Generate treatment schedule email content
 */
function generateTreatmentScheduleEmail(patient, planData, appointments) {
    const firstSession = appointments[0];
    const lastSession = appointments[appointments.length - 1];
    
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0;">Treatment Schedule Confirmed</h1>
            </div>
            <div style="padding: 30px; background: white;">
                <p>Dear ${patient.first_name} ${patient.last_name},</p>
                
                <p>Your personalized treatment plan has been created and scheduled. We're looking forward to supporting your wellness journey.</p>
                
                <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1e3a8a; margin-bottom: 15px;">Treatment Plan Summary</h3>
                    <p><strong>Total Sessions:</strong> ${appointments.length}</p>
                    <p><strong>Duration:</strong> ${planData.duration_weeks} weeks</p>
                    <p><strong>First Session:</strong> ${formatDate(firstSession.appointment_date)} at ${formatTime(firstSession.appointment_time)}</p>
                    <p><strong>Last Session:</strong> ${formatDate(lastSession.appointment_date)} at ${formatTime(lastSession.appointment_time)}</p>
                </div>
                
                <p>Your complete schedule is attached to this email. Please save it for your reference.</p>
                
                <p>Important reminders:</p>
                <ul>
                    <li>Please arrive 10 minutes before your appointment</li>
                    <li>Bring any relevant medical records or test results</li>
                    <li>Wear comfortable clothing</li>
                    <li>Stay hydrated before and after sessions</li>
                </ul>
                
                <p>If you need to reschedule any appointments, please contact us at least 24 hours in advance.</p>
                
                <p>We're here to support you every step of the way!</p>
                
                <p>Warm regards,<br>
                The Celloxen Wellness Team</p>
            </div>
            <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
                <p style="color: #64748b; font-size: 12px;">
                    Celloxen Wellness Platform<br>
                    This email contains confidential medical information
                </p>
            </div>
        </div>
    `;
}

/**
 * Generate schedule HTML for PDF
 */
function generateScheduleHTML(patient, planData, appointments) {
    const rows = appointments.map((apt, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${formatDate(apt.appointment_date)}</td>
            <td>${formatTime(apt.appointment_time)}</td>
            <td>${apt.therapy_code || 'General'}</td>
            <td>${apt.duration_minutes || 45} min</td>
        </tr>
    `).join('');
    
    return `
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #1e3a8a; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #1e3a8a; color: white; padding: 10px; text-align: left; }
                td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
                .header-info { margin: 20px 0; }
                .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
            </style>
        </head>
        <body>
            <h1>Treatment Schedule</h1>
            <div class="header-info">
                <p><strong>Patient:</strong> ${patient.first_name} ${patient.last_name}</p>
                <p><strong>Patient ID:</strong> ${patient.patient_id}</p>
                <p><strong>Plan Duration:</strong> ${planData.duration_weeks} weeks</p>
                <p><strong>Total Sessions:</strong> ${appointments.length}</p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Session #</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Therapy</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            
            <div class="footer">
                <p>Celloxen Wellness Platform</p>
                <p>Generated on ${new Date().toLocaleDateString('en-GB')}</p>
            </div>
        </body>
        </html>
    `;
}

/**
 * Generate PDF from HTML
 */
async function generatePDF(html) {
    // This would use html2pdf.js library
    // For now, return a mock blob
    return new Blob([html], { type: 'application/pdf' });
}

// Utility functions
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
}

// Export confirmation display component
export function displayConfirmationScreen(container, summary) {
    const html = `
        <div style="text-align: center; padding: 40px; background: white; border-radius: 20px; max-width: 600px; margin: 0 auto;">
            <div style="font-size: 80px; margin-bottom: 30px;">✓</div>
            <h2 style="color: #1e293b; margin-bottom: 30px;">Treatment Plan Successfully Created!</h2>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; margin-bottom: 30px; text-align: left;">
                <h3 style="color: #065f46; margin-bottom: 15px;">Confirmation Summary</h3>
                <div style="display: grid; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="color: #10b981; font-size: 20px;">✓</span>
                        <span>Treatment plan saved</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="color: #10b981; font-size: 20px;">✓</span>
                        <span>${summary.totalSessions} appointments scheduled</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="color: ${summary.emailSent ? '#10b981' : '#f59e0b'}; font-size: 20px;">
                            ${summary.emailSent ? '✓' : '⚠'}
                        </span>
                        <span>${summary.emailSent ? 'Patient notified via email' : 'Email notification pending'}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="color: #10b981; font-size: 20px;">✓</span>
                        <span>Patient status: In Treatment</span>
                    </div>
                </div>
            </div>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
                <p style="margin: 5px 0;"><strong>Plan ID:</strong> ${summary.planId}</p>
                <p style="margin: 5px 0;"><strong>Duration:</strong> ${summary.duration}</p>
                <p style="margin: 5px 0;"><strong>Start Date:</strong> ${summary.startDate}</p>
            </div>
            
            ${summary.errors && summary.errors.length > 0 ? `
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin-bottom: 30px; text-align: left;">
                    <h4 style="color: #991b1b; margin-bottom: 10px;">Note:</h4>
                    <ul style="margin: 0; padding-left: 20px;">
                        ${summary.errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <button onclick="exitToDashboard()" style="
                background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
                color: white;
                border: none;
                padding: 15px 40px;
                border-radius: 10px;
                font-size: 18px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(30, 58, 138, 0.3);
            ">
                Exit to Dashboard →
            </button>
        </div>
    `;
    
    if (container) {
        container.innerHTML = html;
    }
    
    return html;
}

// Make exit function globally available
window.exitToDashboard = function() {
    // Clear any remaining session data
    clearSessionData();
    // Redirect to dashboard
    window.location.href = 'clinic-dashboard.html';
};

export default {
    confirmTreatmentPlan,
    displayConfirmationScreen,
    updateWorkflowStatus,
    clearSessionData
};

console.log('Treatment confirmation module loaded');
