// reassessment-manager.js
// Manages 30-day reassessment cycles and follow-up tracking

import { supabase } from './supabase-config.js';

class ReassessmentManager {
    constructor() {
        this.reassessmentInterval = 30; // days
        this.reminderDays = [25, 28, 30]; // Send reminders at these day marks
    }

    // Check all patients for reassessment needs
    async checkReassessmentsDue() {
        try {
            const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
            const clinicId = authData.clinicId || sessionStorage.getItem('currentClinicId');
            
            if (!clinicId) return [];
            
            // Get all patients with completed initial assessments
            const { data: patients, error } = await supabase
                .from('patient_workflow_status')
                .select(`
                    *,
                    patients(*)
                `)
                .eq('clinic_id', clinicId)
                .in('current_stage', ['in_treatment', 'treatment_complete']);
                
            if (error) throw error;
            
            const reassessmentsDue = [];
            const today = new Date();
            
            for (const patient of patients) {
                const lastAssessment = await this.getLastAssessmentDate(patient.patient_id);
                if (lastAssessment) {
                    const daysSinceAssessment = Math.floor(
                        (today - new Date(lastAssessment)) / (1000 * 60 * 60 * 24)
                    );
                    
                    if (daysSinceAssessment >= this.reassessmentInterval) {
                        reassessmentsDue.push({
                            ...patient,
                            daysSinceAssessment,
                            daysOverdue: daysSinceAssessment - this.reassessmentInterval,
                            lastAssessmentDate: lastAssessment
                        });
                    }
                }
            }
            
            return reassessmentsDue;
        } catch (error) {
            console.error('Error checking reassessments:', error);
            return [];
        }
    }

    // Get last assessment date for a patient
    async getLastAssessmentDate(patientId) {
        try {
            // Check health assessments
            const { data: healthAssessment } = await supabase
                .from('health_assessments')
                .select('created_at, assessment_type')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
                
            if (healthAssessment) {
                return healthAssessment.created_at;
            }
            
            // If no health assessment, check initial registration
            const { data: patient } = await supabase
                .from('patients')
                .select('created_at')
                .eq('id', patientId)
                .single();
                
            return patient?.created_at;
        } catch (error) {
            console.error('Error getting last assessment date:', error);
            return null;
        }
    }

    // Schedule reassessment for a patient
    async scheduleReassessment(patientId, scheduledDate = null) {
        try {
            const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
            const clinicId = authData.clinicId || sessionStorage.getItem('currentClinicId');
            
            // Default to 30 days from today if no date specified
            if (!scheduledDate) {
                scheduledDate = new Date();
                scheduledDate.setDate(scheduledDate.getDate() + this.reassessmentInterval);
            }
            
            // Create reassessment record
            const { data, error } = await supabase
                .from('reassessments')
                .insert([{
                    patient_id: patientId,
                    clinic_id: clinicId,
                    scheduled_date: scheduledDate.toISOString(),
                    status: 'scheduled',
                    reassessment_type: '30_day_followup',
                    reminder_sent: false
                }])
                .select();
                
            if (error) throw error;
            
            // Create reminder tasks
            await this.createReminders(patientId, scheduledDate);
            
            return data[0];
        } catch (error) {
            console.error('Error scheduling reassessment:', error);
            return null;
        }
    }

    // Create reminder tasks for reassessment
    async createReminders(patientId, scheduledDate) {
        try {
            const reminders = [];
            
            for (const daysBefore of [5, 2, 0]) { // Remind 5 days, 2 days, and on the day
                const reminderDate = new Date(scheduledDate);
                reminderDate.setDate(reminderDate.getDate() - daysBefore);
                
                reminders.push({
                    patient_id: patientId,
                    reminder_type: 'reassessment',
                    reminder_date: reminderDate.toISOString(),
                    message: `Reassessment due ${daysBefore === 0 ? 'today' : `in ${daysBefore} days`}`,
                    status: 'pending'
                });
            }
            
            const { error } = await supabase
                .from('reminders')
                .insert(reminders);
                
            if (error) throw error;
        } catch (error) {
            console.error('Error creating reminders:', error);
        }
    }

    // Start reassessment for a patient
    async startReassessment(patientId, assessmentType = 'follow_up') {
        try {
            // Update workflow status
            const { error: workflowError } = await supabase
                .from('patient_workflow_status')
                .update({
                    current_stage: 'reassessment',
                    reassessment_due: false,
                    updated_at: new Date().toISOString()
                })
                .eq('patient_id', patientId);
                
            if (workflowError) throw workflowError;
            
            // Record transition
            await this.recordTransition(patientId, 'reassessment_started');
            
            // Navigate to Lily AI with reassessment mode
            sessionStorage.setItem('assessmentMode', 'reassessment');
            sessionStorage.setItem('currentPatientId', patientId);
            window.location.href = 'lily-ai-agent.html?mode=reassessment';
            
        } catch (error) {
            console.error('Error starting reassessment:', error);
        }
    }

    // Complete reassessment and generate comparison report
    async completeReassessment(patientId, newAssessmentData) {
        try {
            // Get previous assessment for comparison
            const previousAssessment = await this.getPreviousAssessment(patientId);
            
            // Calculate improvements
            const comparisonData = this.compareAssessments(previousAssessment, newAssessmentData);
            
            // Save reassessment with comparison
            const { data, error } = await supabase
                .from('reassessments')
                .update({
                    status: 'completed',
                    assessment_data: newAssessmentData,
                    comparison_data: comparisonData,
                    completed_at: new Date().toISOString()
                })
                .eq('patient_id', patientId)
                .eq('status', 'scheduled')
                .select();
                
            if (error) throw error;
            
            // Schedule next reassessment
            await this.scheduleReassessment(patientId);
            
            // Update workflow status
            await this.updateWorkflowAfterReassessment(patientId, comparisonData);
            
            return comparisonData;
        } catch (error) {
            console.error('Error completing reassessment:', error);
            return null;
        }
    }

    // Get previous assessment for comparison
    async getPreviousAssessment(patientId) {
        try {
            const { data, error } = await supabase
                .from('health_assessments')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
                .limit(2); // Get last 2 assessments
                
            if (error) throw error;
            
            // Return the older one for comparison
            return data.length > 1 ? data[1] : data[0];
        } catch (error) {
            console.error('Error getting previous assessment:', error);
            return null;
        }
    }

    // Compare two assessments and calculate improvements
    compareAssessments(previousData, currentData) {
        if (!previousData || !currentData) return null;
        
        const comparison = {
            improvements: [],
            declines: [],
            stable: [],
            overallImprovement: 0
        };
        
        const prevScores = previousData.assessment_data?.scores?.categories || {};
        const currScores = currentData.scores?.categories || {};
        
        let totalImprovement = 0;
        let domainCount = 0;
        
        for (const [domain, prevScore] of Object.entries(prevScores)) {
            const currScore = currScores[domain] || prevScore;
            const improvement = prevScore - currScore; // Lower score is better
            const percentChange = ((improvement / prevScore) * 100).toFixed(1);
            
            const domainResult = {
                domain: this.formatDomain(domain),
                previousScore: prevScore,
                currentScore: currScore,
                change: improvement,
                percentChange: percentChange
            };
            
            if (improvement > 10) {
                comparison.improvements.push(domainResult);
            } else if (improvement < -10) {
                comparison.declines.push(domainResult);
            } else {
                comparison.stable.push(domainResult);
            }
            
            totalImprovement += improvement;
            domainCount++;
        }
        
        comparison.overallImprovement = domainCount > 0 ? 
            Math.round(totalImprovement / domainCount) : 0;
            
        return comparison;
    }

    // Update workflow after reassessment
    async updateWorkflowAfterReassessment(patientId, comparisonData) {
        try {
            let nextStage = 'in_treatment'; // Default continue treatment
            
            // If significant improvement (>30%), consider treatment complete
            if (comparisonData?.overallImprovement > 30) {
                nextStage = 'treatment_complete';
            }
            // If decline, may need to restart assessment cycle
            else if (comparisonData?.overallImprovement < -10) {
                nextStage = 'health_assessment';
            }
            
            const { error } = await supabase
                .from('patient_workflow_status')
                .update({
                    current_stage: nextStage,
                    last_reassessment: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('patient_id', patientId);
                
            if (error) throw error;
            
            // Record transition
            await this.recordTransition(patientId, `reassessment_complete_${nextStage}`);
            
        } catch (error) {
            console.error('Error updating workflow after reassessment:', error);
        }
    }

    // Get pending reminders
    async getPendingReminders() {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const { data, error } = await supabase
                .from('reminders')
                .select(`
                    *,
                    patients(first_name, last_name, patient_id)
                `)
                .eq('status', 'pending')
                .lte('reminder_date', today)
                .eq('reminder_type', 'reassessment')
                .order('reminder_date');
                
            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('Error getting pending reminders:', error);
            return [];
        }
    }

    // Send reminder (would integrate with email/SMS service)
    async sendReminder(reminderId) {
        try {
            // In production, this would send actual email/SMS
            console.log('Sending reminder:', reminderId);
            
            // Mark as sent
            const { error } = await supabase
                .from('reminders')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString()
                })
                .eq('id', reminderId);
                
            if (error) throw error;
            
            return true;
        } catch (error) {
            console.error('Error sending reminder:', error);
            return false;
        }
    }

    // Record workflow transition
    async recordTransition(patientId, action) {
        try {
            const authData = JSON.parse(localStorage.getItem('celloxen_auth') || '{}');
            
            await supabase
                .from('workflow_transitions')
                .insert([{
                    patient_id: patientId,
                    from_stage: 'in_treatment',
                    to_stage: 'reassessment',
                    action_taken: action,
                    performed_by: authData.userId || null,
                    notes: 'Reassessment cycle'
                }]);
        } catch (error) {
            console.error('Error recording transition:', error);
        }
    }

    // Format domain name
    formatDomain(domain) {
        const formats = {
            sleep: 'Sleep Quality',
            stress: 'Stress Management',
            cardiovascular: 'Cardiovascular Health',
            joint: 'Joint Health',
            digestive: 'Digestive Wellness',
            kidney: 'Kidney Function',
            energy: 'Energy Levels',
            metabolic: 'Metabolic Health'
        };
        return formats[domain] || domain;
    }

    // Get reassessment dashboard data
    async getReassessmentDashboard() {
        try {
            const dueList = await this.checkReassessmentsDue();
            const reminders = await this.getPendingReminders();
            
            const { data: completed } = await supabase
                .from('reassessments')
                .select('*')
                .eq('status', 'completed')
                .order('completed_at', { ascending: false })
                .limit(10);
                
            return {
                due: dueList,
                reminders: reminders,
                recentlyCompleted: completed || [],
                statistics: {
                    totalDue: dueList.length,
                    overdueCount: dueList.filter(p => p.daysOverdue > 0).length,
                    pendingReminders: reminders.length,
                    completedThisMonth: completed?.filter(r => {
                        const completedDate = new Date(r.completed_at);
                        const thisMonth = new Date();
                        return completedDate.getMonth() === thisMonth.getMonth() &&
                               completedDate.getFullYear() === thisMonth.getFullYear();
                    }).length || 0
                }
            };
        } catch (error) {
            console.error('Error getting dashboard data:', error);
            return null;
        }
    }
}

// Export singleton instance
export const reassessmentManager = new ReassessmentManager();
