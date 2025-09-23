// Bulk Appointment Creator Module for Celloxen Platform
// Handles efficient creation of multiple appointments with conflict detection

import { supabase } from './supabase-config.js';

/**
 * Create multiple appointments in bulk
 * @param {Array} appointments - Array of appointment objects
 * @returns {Object} Result object with success status and count
 */
export async function createBulkAppointments(appointments) {
    try {
        if (!appointments || appointments.length === 0) {
            return { 
                success: false, 
                error: 'No appointments to create',
                count: 0
            };
        }
        
        // Validate all appointments have required fields
        const validationErrors = validateAppointments(appointments);
        if (validationErrors.length > 0) {
            return {
                success: false,
                error: `Validation errors: ${validationErrors.join(', ')}`,
                count: 0
            };
        }
        
        // Check for conflicts before creating
        const conflicts = await checkConflicts(appointments);
        if (conflicts.length > 0) {
            const conflictDates = conflicts.map(c => 
                `${c.appointment_date} at ${c.appointment_time}`
            ).join(', ');
            
            if (!confirm(`Conflicts detected on: ${conflictDates}. Continue anyway?`)) {
                return {
                    success: false,
                    error: 'Cancelled due to conflicts',
                    count: 0,
                    conflicts: conflicts
                };
            }
        }
        
        // Batch insert appointments
        const { data, error } = await supabase
            .from('appointments')
            .insert(appointments)
            .select();
        
        if (error) {
            console.error('Bulk insert error:', error);
            return {
                success: false,
                error: error.message,
                count: 0
            };
        }
        
        // Log successful creation
        await logBulkCreation(appointments, data);
        
        return {
            success: true,
            count: data.length,
            appointments: data,
            message: `Successfully created ${data.length} appointments`
        };
        
    } catch (error) {
        console.error('Error in bulk appointment creation:', error);
        return {
            success: false,
            error: error.message,
            count: 0
        };
    }
}

/**
 * Validate appointment data
 */
function validateAppointments(appointments) {
    const errors = [];
    const requiredFields = [
        'patient_id', 
        'clinic_id', 
        'appointment_date', 
        'appointment_time', 
        'appointment_type'
    ];
    
    appointments.forEach((apt, index) => {
        requiredFields.forEach(field => {
            if (!apt[field]) {
                errors.push(`Appointment ${index + 1} missing ${field}`);
            }
        });
        
        // Validate date format
        if (apt.appointment_date && !isValidDate(apt.appointment_date)) {
            errors.push(`Appointment ${index + 1} has invalid date format`);
        }
        
        // Validate time format
        if (apt.appointment_time && !isValidTime(apt.appointment_time)) {
            errors.push(`Appointment ${index + 1} has invalid time format`);
        }
    });
    
    return errors;
}

/**
 * Check for scheduling conflicts
 */
async function checkConflicts(appointments) {
    try {
        // Get all dates and times to check
        const dateTimeSlots = appointments.map(apt => ({
            date: apt.appointment_date,
            time: apt.appointment_time
        }));
        
        // Query existing appointments for conflicts
        const { data, error } = await supabase
            .from('appointments')
            .select('appointment_date, appointment_time, patient_id')
            .in('appointment_date', dateTimeSlots.map(s => s.date))
            .eq('status', 'scheduled');
        
        if (error) {
            console.error('Error checking conflicts:', error);
            return [];
        }
        
        // Find conflicts
        const conflicts = [];
        dateTimeSlots.forEach(slot => {
            const conflict = data.find(existing => 
                existing.appointment_date === slot.date &&
                existing.appointment_time === slot.time
            );
            
            if (conflict) {
                conflicts.push(conflict);
            }
        });
        
        return conflicts;
        
    } catch (error) {
        console.error('Error in conflict detection:', error);
        return [];
    }
}

/**
 * Log bulk appointment creation
 */
async function logBulkCreation(appointments, createdData) {
    try {
        const logEntry = {
            action: 'bulk_appointment_creation',
            count: createdData.length,
            patient_id: appointments[0].patient_id,
            clinic_id: appointments[0].clinic_id,
            created_at: new Date().toISOString(),
            metadata: {
                treatment_plan_id: appointments[0].treatment_plan_id,
                date_range: {
                    start: appointments[0].appointment_date,
                    end: appointments[appointments.length - 1].appointment_date
                }
            }
        };
        
        // Store in activity log if table exists
        await supabase
            .from('activity_logs')
            .insert([logEntry]);
            
    } catch (error) {
        // Logging is optional, don't fail the operation
        console.log('Activity logging skipped:', error);
    }
}

/**
 * Reschedule a single appointment
 */
export async function rescheduleAppointment(appointmentId, newDate, newTime) {
    try {
        // Check if new slot is available
        const { data: conflicts, error: conflictError } = await supabase
            .from('appointments')
            .select('id')
            .eq('appointment_date', newDate)
            .eq('appointment_time', newTime)
            .eq('status', 'scheduled')
            .neq('id', appointmentId);
        
        if (conflicts && conflicts.length > 0) {
            return {
                success: false,
                error: 'Time slot already taken'
            };
        }
        
        // Update appointment
        const { data, error } = await supabase
            .from('appointments')
            .update({
                appointment_date: newDate,
                appointment_time: newTime,
                rescheduled_at: new Date().toISOString()
            })
            .eq('id', appointmentId)
            .select()
            .single();
        
        if (error) {
            return {
                success: false,
                error: error.message
            };
        }
        
        return {
            success: true,
            appointment: data
        };
        
    } catch (error) {
        console.error('Error rescheduling appointment:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Cancel multiple appointments
 */
export async function cancelBulkAppointments(appointmentIds) {
    try {
        const { data, error } = await supabase
            .from('appointments')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString()
            })
            .in('id', appointmentIds)
            .select();
        
        if (error) {
            return {
                success: false,
                error: error.message,
                count: 0
            };
        }
        
        return {
            success: true,
            count: data.length,
            message: `Cancelled ${data.length} appointments`
        };
        
    } catch (error) {
        console.error('Error cancelling appointments:', error);
        return {
            success: false,
            error: error.message,
            count: 0
        };
    }
}

/**
 * Update appointment status in bulk
 */
export async function updateBulkStatus(appointmentIds, newStatus) {
    try {
        const validStatuses = ['scheduled', 'completed', 'cancelled', 'no-show', 'rescheduled'];
        
        if (!validStatuses.includes(newStatus)) {
            return {
                success: false,
                error: 'Invalid status'
            };
        }
        
        const updateData = {
            status: newStatus,
            updated_at: new Date().toISOString()
        };
        
        // Add status-specific fields
        if (newStatus === 'completed') {
            updateData.completed_at = new Date().toISOString();
        } else if (newStatus === 'cancelled') {
            updateData.cancelled_at = new Date().toISOString();
        }
        
        const { data, error } = await supabase
            .from('appointments')
            .update(updateData)
            .in('id', appointmentIds)
            .select();
        
        if (error) {
            return {
                success: false,
                error: error.message
            };
        }
        
        return {
            success: true,
            count: data.length,
            appointments: data
        };
        
    } catch (error) {
        console.error('Error updating appointment status:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get appointment slots for a date range
 */
export async function getAvailableSlots(startDate, endDate, duration = 45) {
    try {
        // Define clinic hours
        const clinicHours = {
            start: '09:00',
            end: '17:00'
        };
        
        // Get existing appointments in date range
        const { data: existingAppointments, error } = await supabase
            .from('appointments')
            .select('appointment_date, appointment_time, duration_minutes')
            .gte('appointment_date', startDate)
            .lte('appointment_date', endDate)
            .eq('status', 'scheduled');
        
        if (error) throw error;
        
        // Generate all possible slots
        const availableSlots = [];
        const currentDate = new Date(startDate);
        const end = new Date(endDate);
        
        while (currentDate <= end) {
            // Skip weekends (optional)
            if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const slots = generateDaySlots(
                    dateStr, 
                    clinicHours, 
                    duration, 
                    existingAppointments
                );
                
                availableSlots.push(...slots);
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return {
            success: true,
            slots: availableSlots
        };
        
    } catch (error) {
        console.error('Error getting available slots:', error);
        return {
            success: false,
            error: error.message,
            slots: []
        };
    }
}

/**
 * Generate available slots for a single day
 */
function generateDaySlots(date, hours, duration, existingAppointments) {
    const slots = [];
    const [startHour, startMin] = hours.start.split(':').map(Number);
    const [endHour, endMin] = hours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    for (let time = startTime; time <= endTime - duration; time += duration) {
        const hour = Math.floor(time / 60);
        const minute = time % 60;
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
        
        // Check if slot is available
        const isOccupied = existingAppointments.some(apt => 
            apt.appointment_date === date && 
            apt.appointment_time === timeStr
        );
        
        if (!isOccupied) {
            slots.push({
                date: date,
                time: timeStr,
                available: true
            });
        }
    }
    
    return slots;
}

// Utility functions
function isValidDate(dateStr) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(dateStr);
}

function isValidTime(timeStr) {
    const regex = /^\d{2}:\d{2}(:\d{2})?$/;
    return regex.test(timeStr);
}

// Export additional utilities
export const appointmentUtils = {
    formatTime: (time) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minutes} ${ampm}`;
    },
    
    calculateEndTime: (startTime, durationMinutes) => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + durationMinutes;
        const endHour = Math.floor(totalMinutes / 60);
        const endMin = totalMinutes % 60;
        return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
    },
    
    getNextAvailableSlot: async (clinicId, preferredTime = '10:00') => {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const result = await getAvailableSlots(
            today.toISOString().split('T')[0],
            nextWeek.toISOString().split('T')[0]
        );
        
        if (result.success && result.slots.length > 0) {
            // Find slot closest to preferred time
            const preferred = result.slots.find(s => 
                s.time.startsWith(preferredTime)
            );
            
            return preferred || result.slots[0];
        }
        
        return null;
    }
};

console.log('Bulk appointment creator module loaded successfully');
